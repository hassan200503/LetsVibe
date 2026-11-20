import { NextResponse, type NextRequest } from "next/server";
import { getCtx } from "@/lib/context";
import { DiscoveryError, videoDetails } from "@/lib/media/youtube-discovery";

const MAX_IDS = 30;

/**
 * GET /api/youtube/details?ids=… — duration, views and embeddability for the
 * cards already on screen. Kept separate from search so results paint first;
 * failures here are silent because the video still plays without the extras.
 */
export async function GET(req: NextRequest) {
  const ctx = await getCtx();
  if (!ctx) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((id) => id.trim()))].filter((id) => /^[\w-]{11}$/.test(id));
  if (!ids.length || ids.length > MAX_IDS) return NextResponse.json({ items: [] }, { status: 400 });

  const headers = { "Cache-Control": "private, max-age=900, stale-while-revalidate=3600" };
  try {
    const items = await videoDetails(ids.sort().join(","));
    return NextResponse.json({ configured: true, items }, { headers });
  } catch (error) {
    if (error instanceof DiscoveryError && error.reason === "unconfigured") {
      return NextResponse.json({ configured: false, items: [] }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ configured: true, items: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
