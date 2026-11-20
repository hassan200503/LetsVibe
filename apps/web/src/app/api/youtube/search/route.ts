import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getCtx } from "@/lib/context";
import { getDb } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { isDiscoverCategory, normalizeSearchQuery, type DiscoverCategory } from "@/lib/media/youtube";
import { DiscoveryError, discoverPage, searchPage } from "@/lib/media/youtube-discovery";

const tokenIsValid = (token: string | null) => !token || /^[A-Za-z0-9_\-=]{1,300}$/.test(token);

/**
 * GET /api/youtube/search?q=…&pageToken=…       — search all of YouTube
 * GET /api/youtube/search?category=music&pageToken=… — one live shelf
 *
 * Search results are one upstream call; duration and views arrive from
 * /api/youtube/details so the cards can paint immediately.
 */
export async function GET(req: NextRequest) {
  const ctx = await getCtx();
  if (!ctx) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const q = p.has("q") ? normalizeSearchQuery(p.get("q")) : null;
  const category = p.get("category");
  if (!q && !isDiscoverCategory(category)) {
    return NextResponse.json({ error: p.has("q") ? "Type at least two characters to search." : "Unknown category" }, { status: 400 });
  }
  const token = p.get("pageToken");
  if (!tokenIsValid(token)) return NextResponse.json({ error: "Invalid page" }, { status: 400 });

  const headers = { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" };
  try {
    const page = q ? await searchPage(q, token) : await discoverPage(category as DiscoverCategory, token);

    let added: string[] = [];
    if (page.items.length) {
      const db = await getDb();
      const rows = await db
        .select({ youtubeId: media.youtubeId })
        .from(media)
        .where(
          and(
            eq(media.coupleId, ctx.relationship.id),
            eq(media.source, "youtube"),
            inArray(
              media.youtubeId,
              page.items.map((i) => i.videoId),
            ),
          ),
        );
      added = rows.map((r) => r.youtubeId).filter((v): v is string => !!v);
    }

    return NextResponse.json({ configured: true, query: q, ...page, added }, { headers });
  } catch (error) {
    if (error instanceof DiscoveryError) {
      if (error.reason === "unconfigured") {
        return NextResponse.json(
          {
            configured: false,
            items: [],
            nextPageToken: null,
            added: [],
            error: "Live search needs a free YouTube API key. Add YOUTUBE_API_KEY in Vercel, then redeploy.",
          },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      }
      return NextResponse.json(
        {
          configured: true,
          items: [],
          nextPageToken: null,
          added: [],
          error:
            error.reason === "quota"
              ? "YouTube's daily search limit is reached. Live search recovers when the quota resets."
              : "YouTube didn't answer just now. Try again in a moment.",
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    return NextResponse.json({ error: "Couldn't reach YouTube just now." }, { status: 500 });
  }
}
