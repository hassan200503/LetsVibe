import "server-only";
import { and, count, desc, eq, gt, inArray, max, ne, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { media, mediaComments, mediaReactions, people } from "@/lib/db/schema";
import type { Ctx } from "@/lib/context";
import { viewUrls } from "./storage";
import { DISCOVER_ORDER, isDiscoverCategory, youtubeThumb, type DiscoverCategory } from "./youtube";

export type MediaCard = {
  id: string;
  kind: "photo" | "video" | "song";
  source: "upload" | "youtube";
  youtubeId: string | null;
  collection: string | null;
  title: string | null;
  artist: string | null;
  caption: string | null;
  takenOn: string | null;
  createdAt: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  mime: string | null;
  by: { slug: string; name: string; theme: string };
  thumbUrl: string | null;
  url: string | null;
  reactions: Record<string, string>;
  comments: number;
  isNew: boolean;
};

type Row = typeof media.$inferSelect & { byName: string; byTheme: string };

export async function toCards(ctx: Ctx, rows: Row[], full = true): Promise<MediaCard[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  /**
   * Slugs are couple-scoped (`couple_members.slug`), so they are resolved
   * against this couple's members rather than read off a joined row. A person
   * outside the couple can never produce one, and the account handle never
   * reaches the browser.
   */
  const slugOf = (personId: string) => ctx.members.find((m) => m.id === personId)?.slug ?? "";
  const [reacts, counts, urls] = await Promise.all([
    db
      .select({ mediaId: mediaReactions.mediaId, emoji: mediaReactions.emoji, personId: mediaReactions.personId })
      .from(mediaReactions)
      .where(inArray(mediaReactions.mediaId, ids)),
    db.select({ mediaId: mediaComments.mediaId, n: count() }).from(mediaComments).where(inArray(mediaComments.mediaId, ids)).groupBy(mediaComments.mediaId),
    viewUrls(rows.flatMap((r) => [r.thumbPath, full ? r.path : null])),
  ]);
  const seen = ctx.me.gallerySeenAt ? new Date(ctx.me.gallerySeenAt).getTime() : 0;
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as MediaCard["kind"],
    source: r.source as MediaCard["source"],
    youtubeId: r.youtubeId,
    collection: r.collection,
    title: r.title,
    artist: r.artist,
    caption: r.caption,
    takenOn: r.takenOn,
    createdAt: r.createdAt.toISOString(),
    width: r.width,
    height: r.height,
    durationSec: r.durationSec,
    mime: r.mime,
    by: { slug: slugOf(r.addedBy), name: r.byName, theme: r.byTheme },
    thumbUrl: r.youtubeId ? youtubeThumb(r.youtubeId) : ((r.thumbPath && urls.get(r.thumbPath)) || (r.kind === "photo" && r.path ? urls.get(r.path) : null) || null),
    url: r.path ? (urls.get(r.path) ?? null) : null,
    reactions: Object.fromEntries(reacts.filter((x) => x.mediaId === r.id && slugOf(x.personId)).map((x) => [slugOf(x.personId), x.emoji])),
    comments: counts.find((c) => c.mediaId === r.id)?.n ?? 0,
    isNew: r.addedBy !== ctx.me.id && r.createdAt.getTime() > seen,
  }));
}

const withPerson = {
  id: media.id,
  coupleId: media.coupleId,
  addedBy: media.addedBy,
  kind: media.kind,
  source: media.source,
  origin: media.origin,
  path: media.path,
  thumbPath: media.thumbPath,
  youtubeId: media.youtubeId,
  collection: media.collection,
  mime: media.mime,
  bytes: media.bytes,
  width: media.width,
  height: media.height,
  durationSec: media.durationSec,
  title: media.title,
  artist: media.artist,
  caption: media.caption,
  takenOn: media.takenOn,
  createdAt: media.createdAt,
  byName: people.displayName,
  byTheme: people.theme,
};

const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
function dec(c: string | null | undefined): [string, string] | null {
  if (!c) return null;
  try {
    return JSON.parse(Buffer.from(c, "base64url").toString());
  } catch {
    return null;
  }
}

/** One page of the shared gallery, newest first, keyset-paginated. */
export async function galleryPage(
  ctx: Ctx,
  opts: { kind?: string | null; by?: string | null; collection?: string | null; source?: string | null; cursor?: string | null; limit?: number },
) {
  const db = await getDb();
  const limit = Math.min(opts.limit ?? 24, 60);
  const c = dec(opts.cursor);
  const by = opts.by ? ctx.members.find((m) => m.slug === opts.by) : null;
  const filters: (SQL | undefined)[] = [
    eq(media.coupleId, ctx.relationship.id),
    eq(media.origin, "gallery"),
    opts.kind && ["photo", "video", "song"].includes(opts.kind) ? eq(media.kind, opts.kind) : undefined,
    opts.source === "youtube" || opts.source === "upload" ? eq(media.source, opts.source) : undefined,
    isDiscoverCategory(opts.collection) ? eq(media.collection, opts.collection) : undefined,
    by ? eq(media.addedBy, by.id) : undefined,
    c ? sql`(${media.createdAt}, ${media.id}) < (${c[0]}::timestamptz, ${c[1]}::uuid)` : undefined,
  ];
  const rows = await db
    .select(withPerson)
    .from(media)
    .innerJoin(people, eq(people.id, media.addedBy))
    .where(and(...filters))
    .orderBy(desc(media.createdAt), desc(media.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return { items: await toCards(ctx, page), nextCursor: rows.length > limit && last ? enc([last.createdAt.toISOString(), last.id]) : null };
}

export async function mediaByIds(ctx: Ctx, ids: string[]): Promise<MediaCard[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select(withPerson)
    .from(media)
    .innerJoin(people, eq(people.id, media.addedBy))
    .where(and(eq(media.coupleId, ctx.relationship.id), eq(media.origin, "gallery"), inArray(media.id, ids)));
  const cards = await toCards(ctx, rows);
  return ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is MediaCard => !!c);
}

export async function mediaComments_(ctx: Ctx, id: string) {
  const db = await getDb();
  const rows = await db
    .select({ id: mediaComments.id, body: mediaComments.body, createdAt: mediaComments.createdAt, personId: mediaComments.personId, name: people.displayName })
    .from(mediaComments)
    .innerJoin(people, eq(people.id, mediaComments.personId))
    .innerJoin(media, eq(media.id, mediaComments.mediaId))
    .where(and(eq(mediaComments.mediaId, id), eq(media.coupleId, ctx.relationship.id)))
    .orderBy(mediaComments.createdAt);
  return rows.map((r) => ({ ...r, slug: ctx.members.find((m) => m.id === r.personId)?.slug ?? "" }));
}

/** New posts from the other person since I last opened the gallery. */
export async function unseenCount(ctx: Ctx): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(media)
    .where(
      and(
        eq(media.coupleId, ctx.relationship.id),
        eq(media.origin, "gallery"),
        ne(media.addedBy, ctx.me.id),
        ctx.me.gallerySeenAt ? gt(media.createdAt, new Date(ctx.me.gallerySeenAt)) : undefined,
      ),
    );
  return row?.n ?? 0;
}

export type GalleryStats = {
  total: number;
  photos: number;
  videos: number;
  songs: number;
  uploads: number;
  youtube: number;
  /** What was saved from each live shelf; paste-a-link additions have no shelf. */
  shelves: Record<DiscoverCategory, number>;
  latestAt: string | null;
  unseen: number;
};

/** One round trip for the "Shared gallery" summary on /gallery. */
export async function galleryStats(ctx: Ctx): Promise<GalleryStats> {
  const db = await getDb();
  const couple = eq(media.coupleId, ctx.relationship.id);
  const inGallery = eq(media.origin, "gallery");
  const [rows, unseen, [latest]] = await Promise.all([
    db
      .select({ kind: media.kind, source: media.source, collection: media.collection, n: count() })
      .from(media)
      .where(and(couple, inGallery))
      .groupBy(media.kind, media.source, media.collection),
    unseenCount(ctx),
    db.select({ at: max(media.createdAt) }).from(media).where(and(couple, inGallery)),
  ]);

  const stats: GalleryStats = {
    total: 0,
    photos: 0,
    videos: 0,
    songs: 0,
    uploads: 0,
    youtube: 0,
    shelves: Object.fromEntries(DISCOVER_ORDER.map((key) => [key, 0])) as Record<DiscoverCategory, number>,
    latestAt: latest?.at ? new Date(latest.at).toISOString() : null,
    unseen,
  };

  for (const row of rows) {
    stats.total += row.n;
    if (row.kind === "photo") stats.photos += row.n;
    else if (row.kind === "video") stats.videos += row.n;
    else if (row.kind === "song") stats.songs += row.n;
    if (row.source === "upload") stats.uploads += row.n;
    else if (row.source === "youtube") stats.youtube += row.n;
    if (isDiscoverCategory(row.collection)) stats.shelves[row.collection] += row.n;
  }
  return stats;
}

export async function recentMedia(ctx: Ctx, limit = 6): Promise<MediaCard[]> {
  return (await galleryPage(ctx, { limit })).items;
}
