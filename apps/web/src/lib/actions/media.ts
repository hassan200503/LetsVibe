"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { media, mediaComments, mediaReactions, people, roomEvents } from "@/lib/db/schema";
import { requireCtx } from "@/lib/context";
import { ALLOWED_TYPES, LIMITS, inspect, newPath, ownsPath, remove, storageMode, type StorageMode } from "@/lib/media/storage";
import { isDiscoverCategory, youtubeIdFrom } from "@/lib/media/youtube";
import { storageAvailable } from "@/lib/entitlements/server";

export type Prepared = { ok: true; mode: Exclude<StorageMode, "none">; path: string; thumbPath: string | null } | { ok: false; error: string };

const KIND = z.enum(["photo", "video", "song", "avatar"]);
const ORIGIN = z.enum(["gallery", "chat"]);

/**
 * Step 1 of an upload: the server picks the object path and checks type and
 * size. `origin` decides whether the row belongs in the shared gallery or is
 * owned by one chat message.
 */
export async function prepareUpload(kind: string, mime: string, size: number, origin: "gallery" | "chat" = "gallery"): Promise<Prepared> {
  const ctx = await requireCtx();
  const mode = storageMode();
  if (mode === "none") return { ok: false, error: "Photo & video storage isn't switched on yet. Connect it in Vercel → Storage → Blob." };
  const k = KIND.safeParse(kind);
  if (!k.success) return { ok: false, error: "Unknown kind" };
  if (!ORIGIN.safeParse(origin).success) return { ok: false, error: "Unknown origin" };
  if (!ALLOWED_TYPES.includes(mime)) return { ok: false, error: `${mime || "This file type"} isn't supported. Use a photo, MP4/MOV/WebM video, or MP3/M4A/WAV audio.` };
  const max = k.data === "avatar" ? LIMITS.thumb : LIMITS[k.data];
  if (size > max) return { ok: false, error: `Too large: the limit for ${k.data}s is ${Math.round(max / 1024 / 1024)} MB.` };
  const rel = ctx.relationship.id;
  const thumbEstimate = k.data === "photo" || k.data === "video" ? 320 * 1024 : 0;
  const quota = await storageAvailable(rel, size + thumbEstimate);
  if (!quota.ok) return { ok: false, error: quota.error };
  return {
    ok: true,
    mode,
    path: newPath(rel, k.data, mime),
    thumbPath: k.data === "photo" || k.data === "video" ? newPath(rel, "thumb", "image/webp") : null,
  };
}

const saved = z.object({
  kind: z.enum(["photo", "video", "song"]),
  origin: ORIGIN.default("gallery"),
  path: z.string(),
  thumbPath: z.string().nullable().optional(),
  mime: z.string().max(80),
  width: z.number().int().positive().max(20000).nullable().optional(),
  height: z.number().int().positive().max(20000).nullable().optional(),
  durationSec: z.number().nonnegative().max(60 * 60 * 6).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  artist: z.string().max(200).nullable().optional(),
  caption: z.string().max(2000).nullable().optional(),
  takenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

/** Step 2: record an uploaded file, after confirming it really exists in our folder. */
export async function saveUploaded(input: z.infer<typeof saved>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await requireCtx();
  const parsed = saved.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid upload" };
  const d = parsed.data;
  const rel = ctx.relationship.id;
  if (!ownsPath(rel, d.path) || (d.thumbPath && !ownsPath(rel, d.thumbPath))) return { ok: false, error: "Not your folder" };
  const info = await inspect(d.path);
  if (!info) return { ok: false, error: "The upload didn't finish. Please try again." };
  const thumbInfo = d.thumbPath ? await inspect(d.thumbPath) : null;
  const quota = await storageAvailable(rel, info.size + (thumbInfo?.size ?? 0));
  if (!quota.ok) {
    await remove([d.path, d.thumbPath]);
    return { ok: false, error: quota.error };
  }
  const db = await getDb();
  const [row] = await db
    .insert(media)
    .values({
      coupleId: rel,
      addedBy: ctx.me.id,
      kind: d.kind,
      source: "upload",
      origin: d.origin,
      path: d.path,
      thumbPath: thumbInfo ? d.thumbPath : null,
      mime: info.contentType ?? d.mime,
      bytes: info.size,
      width: d.width ?? null,
      height: d.height ?? null,
      durationSec: d.durationSec ?? null,
      title: d.title?.trim() || null,
      artist: d.artist?.trim() || null,
      caption: d.caption?.trim() || null,
      takenOn: d.takenOn ?? null,
    })
    .returning({ id: media.id });
  if (d.origin === "gallery") revalidatePath("/gallery");
  return { ok: true, id: row.id };
}

async function youtubeMeta(id: string): Promise<{ title: string | null; artist: string | null }> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (res.ok) {
      const j = (await res.json()) as { title?: string; author_name?: string };
      return {
        title: j.title?.slice(0, 200) ?? null,
        artist: j.author_name?.replace(/ - Topic$/, "").slice(0, 200) ?? null,
      };
    }
  } catch {
    // The title is a nicety; the video plays without it.
  }
  return { title: null, artist: null };
}

/** Songs and videos from YouTube: full tracks, no storage used. */
export async function addYouTube(_: unknown, fd: FormData): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const ctx = await requireCtx();
  const id = youtubeIdFrom(String(fd.get("url") ?? ""));
  if (!id) return { error: "That doesn't look like a YouTube link." };
  const kind = fd.get("kind") === "video" ? "video" : "song";
  const caption = String(fd.get("caption") ?? "").trim().slice(0, 2000) || null;
  const meta = await youtubeMeta(id);
  const db = await getDb();
  await db.insert(media).values({ coupleId: ctx.relationship.id, addedBy: ctx.me.id, kind, source: "youtube", youtubeId: id, title: meta.title, artist: meta.artist, caption });
  revalidatePath("/gallery");
  return { ok: true, message: kind === "song" ? "Song added 🎶" : "Video added 🎬" };
}

/** One tap from the live shelves or search: the result gets added with the metadata already on screen. */
const fromSearch = z.object({
  videoId: z.string().regex(/^[\w-]{11}$/),
  collection: z.string().nullable().optional(),
  kind: z.enum(["song", "video"]).optional(),
  title: z.string().max(200).nullable().optional(),
  channel: z.string().max(200).nullable().optional(),
  durationSec: z.number().nonnegative().max(60 * 60 * 12).nullable().optional(),
});

export async function addYouTubeFromSearch(input: z.infer<typeof fromSearch>): Promise<{ ok: boolean; message?: string; error?: string }> {
  const ctx = await requireCtx();
  const parsed = fromSearch.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That video doesn't look right." };
  const { videoId, durationSec } = parsed.data;
  const collection = isDiscoverCategory(parsed.data.collection) ? parsed.data.collection : null;
  const kind = parsed.data.kind ?? (collection === "music" ? "song" : "video");
  const givenTitle = parsed.data.title?.trim().slice(0, 200) || null;
  const givenArtist = parsed.data.channel?.replace(/ - Topic$/, "").trim().slice(0, 200) || null;

  const db = await getDb();
  const [existing] = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.coupleId, ctx.relationship.id), eq(media.source, "youtube"), eq(media.youtubeId, videoId)))
    .limit(1);
  if (existing) return { ok: true, message: "Already in your gallery" };

  const meta = givenTitle ? { title: givenTitle, artist: givenArtist } : await youtubeMeta(videoId);
  await db.insert(media).values({
    coupleId: ctx.relationship.id,
    addedBy: ctx.me.id,
    kind,
    source: "youtube",
    youtubeId: videoId,
    collection,
    title: meta.title,
    artist: meta.artist,
    durationSec: durationSec ?? null,
  });
  revalidatePath("/gallery");
  revalidatePath("/gallery/all");
  return { ok: true, message: kind === "song" ? "Song added 🎶" : "Video added 🎬" };
}

async function ownMedia(id: string) {
  const ctx = await requireCtx();
  if (!z.uuid().safeParse(id).success) return null;
  const db = await getDb();
  const [row] = await db.select().from(media).where(and(eq(media.id, id), eq(media.coupleId, ctx.relationship.id)));
  return row ? { ctx, db, row } : null;
}

/** Only the person who posted something can delete it. */
export async function deleteMedia(id: string): Promise<{ ok: boolean; error?: string }> {
  const found = await ownMedia(id);
  if (!found) return { ok: false, error: "Not found" };
  if (found.row.addedBy !== found.ctx.me.id) return { ok: false, error: "Only the person who posted it can delete it" };
  const { db, row } = found;
  const inUseAsAvatar = row.path ? await db.select({ id: people.id }).from(people).where(eq(people.avatarPath, row.thumbPath ?? row.path)) : [];
  await db.delete(media).where(eq(media.id, id));
  // Keep a thumbnail that someone is using as their profile picture.
  await remove([row.path, inUseAsAvatar.length ? null : row.thumbPath]);
  revalidatePath("/gallery");
  return { ok: true };
}

const EMOJI = ["❤️", "😍", "🥹", "😂", "🔥", "😮"];

export async function reactToMedia(id: string, emoji: string | null): Promise<{ ok: boolean }> {
  const found = await ownMedia(id);
  if (!found) return { ok: false };
  const { db, ctx } = found;
  const where = and(eq(mediaReactions.mediaId, id), eq(mediaReactions.personId, ctx.me.id));
  if (!emoji || !EMOJI.includes(emoji)) await db.delete(mediaReactions).where(where);
  else
    await db
      .insert(mediaReactions)
      .values({ mediaId: id, coupleId: ctx.relationship.id, personId: ctx.me.id, emoji })
      .onConflictDoUpdate({ target: [mediaReactions.mediaId, mediaReactions.personId], set: { emoji, createdAt: new Date() } });
  return { ok: true };
}

export async function commentOnMedia(id: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const found = await ownMedia(id);
  if (!found) return { ok: false, error: "Not found" };
  const text = body.trim().slice(0, 1000);
  if (!text) return { ok: false, error: "Write something first" };
  await found.db.insert(mediaComments).values({ mediaId: id, coupleId: found.ctx.relationship.id, personId: found.ctx.me.id, body: text });
  return { ok: true };
}

export async function deleteComment(commentId: string): Promise<void> {
  const ctx = await requireCtx();
  if (!z.uuid().safeParse(commentId).success) return;
  const db = await getDb();
  await db.delete(mediaComments).where(and(eq(mediaComments.id, commentId), eq(mediaComments.personId, ctx.me.id)));
}

/** Use an uploaded square picture (from Settings) as my profile picture. */
export async function setAvatar(p: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireCtx();
  const info = ownsPath(ctx.relationship.id, p) ? await inspect(p) : null;
  if (!info) return { ok: false, error: "Upload didn't finish" };
  const quota = await storageAvailable(ctx.relationship.id, info.size);
  if (!quota.ok) {
    await remove([p]);
    return { ok: false, error: quota.error };
  }
  const db = await getDb();
  const [old] = await db.select({ avatarPath: people.avatarPath }).from(people).where(eq(people.id, ctx.me.id));
  await db.update(people).set({ avatarPath: p }).where(eq(people.id, ctx.me.id));
  // Remove the old avatar file only if it was a dedicated avatar upload.
  if (old?.avatarPath?.includes("/avatar/") && old.avatarPath !== p) await remove([old.avatarPath]);
  await db.insert(roomEvents).values({ coupleId: ctx.relationship.id, personId: ctx.me.id, kind: "system", body: "updated their profile picture" });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** "Set as my profile picture" from a photo in the gallery (uses its thumbnail). */
export async function setAvatarFromMedia(id: string): Promise<{ ok: boolean; error?: string }> {
  const found = await ownMedia(id);
  if (!found || found.row.kind !== "photo") return { ok: false, error: "Choose a photo" };
  const p = found.row.thumbPath ?? found.row.path;
  if (!p) return { ok: false, error: "No file" };
  await found.db.update(people).set({ avatarPath: p }).where(eq(people.id, found.ctx.me.id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeAvatar(): Promise<void> {
  const ctx = await requireCtx();
  const db = await getDb();
  await db.update(people).set({ avatarPath: null }).where(eq(people.id, ctx.me.id));
  revalidatePath("/", "layout");
}

export async function markGallerySeen(): Promise<void> {
  const ctx = await requireCtx();
  const db = await getDb();
  await db.update(people).set({ gallerySeenAt: new Date() }).where(eq(people.id, ctx.me.id));
}
