import "server-only";
import { and, desc, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import type { Ctx } from "@/lib/context";
import { getDb, withSchema } from "@/lib/db/client";
import { chatState, media, messages, presence } from "@/lib/db/schema";
import { remove, viewUrls } from "@/lib/media/storage";
import { EDIT_WINDOW_MS, MAX_MESSAGE, MAX_PEAKS, MAX_VOICE_MS, type ChatAttachment, type ChatMessage, type ChatPartner, type ChatQuote, type ChatSync } from "./types";

type Row = typeof messages.$inferSelect;

const ONLINE_MS = 70_000;
const PAGE = 60;
/** Polls ask for changes since their last sync, overlapped so slow commits are never missed. */
const OVERLAP_MS = 5_000;

const notHiddenFor = (personId: string) => sql`not (${personId}::uuid = any(${messages.hiddenFor}))`;
const snippet = (r: Pick<Row, "body" | "kind" | "deletedAt" | "meta">) =>
  r.deletedAt ? "" : r.kind === "call" ? "Call" : r.kind === "media" ? (r.meta?.attachmentKind === "voice" ? "Voice note" : "Photo") : r.body.slice(0, 180);

/** Attachment rows for a page of messages, read through the couple's own tenant. */
async function attachmentsFor(coupleId: string, rows: Row[]): Promise<Map<string, ChatAttachment>> {
  const ids = [...new Set(rows.map((r) => r.meta?.attachmentId).filter((id): id is string => !!id))];
  if (!ids.length) return new Map();
  const db = await getDb();
  const found = await db.select().from(media).where(and(eq(media.coupleId, coupleId), inArray(media.id, ids)));
  const urls = await viewUrls(found.flatMap((m) => [m.path, m.thumbPath]));
  const out = new Map<string, ChatAttachment>();
  for (const m of found) {
    const meta = rows.find((r) => r.meta?.attachmentId === m.id)?.meta;
    out.set(m.id, {
      id: m.id,
      kind: m.kind === "song" ? "voice" : "image",
      url: m.path ? (urls.get(m.path) ?? null) : null,
      thumbUrl: m.thumbPath ? (urls.get(m.thumbPath) ?? null) : null,
      width: m.width,
      height: m.height,
      durationSec: m.durationSec,
      peaks: (meta?.peaks ?? []).slice(0, MAX_PEAKS),
    });
  }
  return out;
}

async function toMessages(ctx: Ctx, rows: Row[]): Promise<ChatMessage[]> {
  if (!rows.length) return [];
  const slug = (id: string) => ctx.members.find((m) => m.id === id)?.slug ?? "";
  const quoteIds = [...new Set(rows.map((r) => r.replyToId).filter((x): x is number => !!x))];
  const db = await getDb();
  const quoted = quoteIds.length ? await db.select().from(messages).where(and(eq(messages.coupleId, ctx.relationship.id), inArray(messages.id, quoteIds))) : [];
  const quote = (id: number | null): ChatQuote | null => {
    const q = id ? quoted.find((x) => x.id === id) : null;
    return q ? { id: q.id, slug: slug(q.senderId), kind: q.kind, body: snippet(q), deleted: !!q.deletedAt } : null;
  };
  const attachments = await attachmentsFor(ctx.relationship.id, rows);
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    slug: slug(r.senderId),
    kind: r.kind === "call" ? "call" : r.kind === "media" ? "media" : "text",
    body: r.deletedAt ? "" : r.body,
    attachment: r.deletedAt || !r.meta?.attachmentId ? null : (attachments.get(r.meta.attachmentId) ?? null),
    replyTo: r.deletedAt ? null : quote(r.replyToId),
    call:
      r.kind === "call" && r.meta
        ? { callKind: r.meta.callKind ?? "audio", outcome: r.meta.outcome ?? "completed", durationSec: r.meta.durationSec ?? null }
        : null,
    reactions: r.deletedAt ? {} : Object.fromEntries(Object.entries(r.reactions ?? {}).map(([pid, e]) => [slug(pid), e])),
    deleted: !!r.deletedAt,
    edited: !!r.editedAt && !r.deletedAt,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

async function partnerState(ctx: Ctx, now: Date): Promise<ChatPartner | null> {
  const partner = ctx.partner;
  if (!partner) return null;
  const db = await getDb();
  const [[p], [c]] = await Promise.all([
    db.select().from(presence).where(eq(presence.personId, partner.id)),
    db.select().from(chatState).where(eq(chatState.personId, partner.id)),
  ]);
  const online = !!p && p.place !== "away" && now.getTime() - p.lastSeenAt.getTime() < ONLINE_MS;
  return {
    slug: partner.slug,
    online,
    lastSeenAt: p?.lastSeenAt.toISOString() ?? null,
    typing: online && !!c?.typingUntil && c.typingUntil.getTime() > now.getTime(),
    readUpTo: c?.lastReadId ?? 0,
    deliveredUpTo: Math.max(c?.lastDeliveredId ?? 0, c?.lastReadId ?? 0),
  };
}

/** Everything from my partner up to now has reached one of my devices. */
export async function markDelivered(ctx: Ctx) {
  const db = await getDb();
  await db.execute(sql`
    insert into ${chatState} (person_id, couple_id, last_delivered_id)
    select ${ctx.me.id}::uuid, ${ctx.relationship.id}::uuid, coalesce(max(id), 0) from ${messages}
    where couple_id = ${ctx.relationship.id}::uuid and sender_id <> ${ctx.me.id}::uuid
    on conflict (person_id) do update set last_delivered_id = excluded.last_delivered_id
    where ${chatState.lastDeliveredId} < excluded.last_delivered_id`);
}

async function myReadUpTo(ctx: Ctx) {
  const db = await getDb();
  const [row] = await db.select({ id: chatState.lastReadId }).from(chatState).where(eq(chatState.personId, ctx.me.id));
  return row?.id ?? 0;
}

/**
 * One chat sync. Without `since`: the latest page (or the page before
 * `before`). With `since`: every message created, edited, reacted to or
 * deleted after that moment.
 */
export function syncChat(ctx: Ctx, opts: { since?: string | null; before?: number | null }): Promise<ChatSync> {
  return withSchema(async () => {
    const db = await getDb();
    const now = new Date();
    const rel = eq(messages.coupleId, ctx.relationship.id);
    const sinceMs = opts.since ? Date.parse(opts.since) : NaN;
    await markDelivered(ctx);

    if (Number.isFinite(sinceMs)) {
      const rows = await db
        .select()
        .from(messages)
        .where(and(rel, gt(messages.updatedAt, new Date(sinceMs - OVERLAP_MS))))
        .orderBy(messages.id)
        .limit(500);
      const hidden = rows.filter((r) => r.hiddenFor.includes(ctx.me.id));
      const [list, partner, readUpTo] = await Promise.all([toMessages(ctx, rows.filter((r) => !r.hiddenFor.includes(ctx.me.id))), partnerState(ctx, now), myReadUpTo(ctx)]);
      return { serverNow: now.toISOString(), messages: list, removed: hidden.map((r) => r.id), partner, myReadUpTo: readUpTo };
    }

    const rows = await db
      .select()
      .from(messages)
      .where(and(rel, notHiddenFor(ctx.me.id), opts.before ? lt(messages.id, opts.before) : undefined))
      .orderBy(desc(messages.id))
      .limit(PAGE + 1);
    const page = rows.slice(0, PAGE).reverse();
    const [list, partner, readUpTo] = await Promise.all([toMessages(ctx, page), partnerState(ctx, now), myReadUpTo(ctx)]);
    return { serverNow: now.toISOString(), messages: list, removed: [], partner, myReadUpTo: readUpTo, hasMore: rows.length > PAGE };
  });
}

export const chatAction = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("send"),
      clientId: z.string().min(8).max(64),
      body: z.string().trim().max(MAX_MESSAGE).default(""),
      replyTo: z.number().int().positive().nullish(),
      /** A media row created by an upload in this chat (origin "chat"), owned by the sender. */
      attachmentId: z.uuid().nullish(),
      peaks: z.array(z.number().min(0).max(1)).max(MAX_PEAKS).nullish(),
    })
    .refine((a) => a.body.length > 0 || !!a.attachmentId, { message: "Write something or attach a photo or voice note." }),
  z.object({ type: z.literal("edit"), id: z.number().int().positive(), body: z.string().trim().min(1).max(MAX_MESSAGE) }),
  z.object({ type: z.literal("delete"), id: z.number().int().positive(), scope: z.enum(["me", "everyone"]) }),
  z.object({ type: z.literal("react"), id: z.number().int().positive(), emoji: z.string().min(1).max(16).nullable() }),
  z.object({ type: z.literal("typing"), on: z.boolean() }),
  z.object({ type: z.literal("read"), upTo: z.number().int().min(0) }),
]);
export type ChatAction = z.infer<typeof chatAction>;

export type ChatActionResult = { ok: true; message?: ChatMessage } | { ok: false; error: string };

async function setTyping(ctx: Ctx, until: Date | null) {
  const db = await getDb();
  await db
    .insert(chatState)
    .values({ personId: ctx.me.id, coupleId: ctx.relationship.id, typingUntil: until })
    .onConflictDoUpdate({ target: chatState.personId, set: { typingUntil: until, updatedAt: new Date() } });
}

async function own(ctx: Ctx, id: number): Promise<Row | null> {
  const db = await getDb();
  const [row] = await db.select().from(messages).where(and(eq(messages.id, id), eq(messages.coupleId, ctx.relationship.id)));
  return row ?? null;
}

export function applyChat(ctx: Ctx, a: ChatAction): Promise<ChatActionResult> {
  return withSchema(async () => {
    const db = await getDb();
    const now = new Date();
    switch (a.type) {
      case "send": {
        // A retry after a lost reply is the same message, not a second send.
        const [already] = await db
          .select()
          .from(messages)
          .where(and(eq(messages.coupleId, ctx.relationship.id), eq(messages.clientId, a.clientId)))
          .limit(1);
        if (already) return { ok: true, message: (await toMessages(ctx, [already]))[0] };
        const reply = a.replyTo ? await own(ctx, a.replyTo) : null;
        let meta: Row["meta"] = null;
        if (a.attachmentId) {
          const [file] = await db
            .select()
            .from(media)
            .where(and(eq(media.id, a.attachmentId), eq(media.coupleId, ctx.relationship.id), eq(media.origin, "chat"), eq(media.addedBy, ctx.me.id)));
          if (!file) return { ok: false, error: "That attachment is no longer available. Try sending it again." };
          const [used] = await db
            .select({ id: messages.id })
            .from(messages)
            .where(and(eq(messages.coupleId, ctx.relationship.id), sql`${messages.meta}->>'attachmentId' = ${file.id}`))
            .limit(1);
          if (used) return { ok: false, error: "That attachment was already sent." };
          if (file.durationSec && file.durationSec * 1000 > MAX_VOICE_MS + 1_000) return { ok: false, error: "Voice notes can be up to five minutes." };
          meta = { attachmentId: file.id, attachmentKind: file.kind === "song" ? "voice" : "image", peaks: (a.peaks ?? []).slice(0, MAX_PEAKS) };
        }
        const [created] = await db
          .insert(messages)
          .values({
            coupleId: ctx.relationship.id,
            senderId: ctx.me.id,
            clientId: a.clientId,
            kind: a.attachmentId ? "media" : "text",
            body: a.body,
            replyToId: reply && !reply.deletedAt ? reply.id : null,
            meta,
          })
          .onConflictDoNothing({ target: [messages.coupleId, messages.clientId] })
          .returning();
        // A retry of a send that already landed returns the stored message.
        const row = created ?? (await db.select().from(messages).where(and(eq(messages.coupleId, ctx.relationship.id), eq(messages.clientId, a.clientId))))[0];
        await Promise.all([
          setTyping(ctx, null),
          db.execute(sql`
            insert into ${chatState} (person_id, couple_id, last_read_id)
            select ${ctx.me.id}::uuid, ${ctx.relationship.id}::uuid, coalesce(max(id), 0) from ${messages}
            where couple_id = ${ctx.relationship.id}::uuid and sender_id <> ${ctx.me.id}::uuid and id < ${row.id}
            on conflict (person_id) do update set last_read_id = greatest(${chatState.lastReadId}, excluded.last_read_id)`),
        ]);
        const [message] = await toMessages(ctx, [row]);
        if (created) after(() => notifyPartner(ctx, message));
        return { ok: true, message };
      }
      case "edit": {
        const row = await own(ctx, a.id);
        if (!row || row.senderId !== ctx.me.id || row.kind !== "text" || row.deletedAt) return { ok: false, error: "You can only edit your own messages." };
        if (now.getTime() - row.createdAt.getTime() > EDIT_WINDOW_MS) return { ok: false, error: "Messages can be edited for 15 minutes after sending." };
        const [updated] = await db.update(messages).set({ body: a.body, editedAt: now, updatedAt: now }).where(eq(messages.id, row.id)).returning();
        return { ok: true, message: (await toMessages(ctx, [updated]))[0] };
      }
      case "delete": {
        const row = await own(ctx, a.id);
        if (!row) return { ok: false, error: "That message is gone." };
        if (a.scope === "everyone") {
          if (row.senderId !== ctx.me.id) return { ok: false, error: "Only the sender can delete a message for everyone." };
          await db.update(messages).set({ deletedAt: now, body: "", reactions: {}, meta: null, updatedAt: now }).where(eq(messages.id, row.id));
          // A deleted attachment stops existing for both people: drop the row and its object.
          if (row.meta?.attachmentId) {
            const [file] = await db
              .select()
              .from(media)
              .where(and(eq(media.id, row.meta.attachmentId), eq(media.coupleId, ctx.relationship.id), eq(media.origin, "chat")));
            if (file) {
              await db.delete(media).where(eq(media.id, file.id));
              await remove([file.path, file.thumbPath]).catch(() => {});
            }
          }
        } else if (!row.hiddenFor.includes(ctx.me.id)) {
          await db
            .update(messages)
            .set({ hiddenFor: sql`array_append(${messages.hiddenFor}, ${ctx.me.id}::uuid)`, updatedAt: now })
            .where(eq(messages.id, row.id));
        }
        return { ok: true };
      }
      case "react": {
        const row = await own(ctx, a.id);
        if (!row || row.deletedAt) return { ok: false, error: "That message is gone." };
        await db
          .update(messages)
          .set({
            reactions: a.emoji ? sql`${messages.reactions} || jsonb_build_object(${ctx.me.id}::text, ${a.emoji}::text)` : sql`${messages.reactions} - ${ctx.me.id}::text`,
            updatedAt: now,
          })
          .where(eq(messages.id, row.id));
        return { ok: true };
      }
      case "typing":
        await setTyping(ctx, a.on ? new Date(now.getTime() + 6_000) : null);
        return { ok: true };
      case "read":
        await db
          .insert(chatState)
          .values({ personId: ctx.me.id, coupleId: ctx.relationship.id, lastReadId: a.upTo, lastDeliveredId: a.upTo })
          .onConflictDoUpdate({
            target: chatState.personId,
            set: { lastReadId: sql`greatest(${chatState.lastReadId}, ${a.upTo})`, lastDeliveredId: sql`greatest(${chatState.lastDeliveredId}, ${a.upTo})`, updatedAt: now },
          });
        return { ok: true };
    }
  });
}

/** Unread count and the newest unread line, for badges and message toasts anywhere on the site. */
export async function unreadSummary(ctx: Ctx): Promise<{ unread: number; latest: { id: number; slug: string; body: string } | null }> {
  const db = await getDb();
  const readUpTo = await myReadUpTo(ctx);
  const where = and(eq(messages.coupleId, ctx.relationship.id), ne(messages.senderId, ctx.me.id), gt(messages.id, readUpTo), sql`${messages.deletedAt} is null`, notHiddenFor(ctx.me.id));
  const [[{ n }], [latest]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(messages).where(where),
    db.select().from(messages).where(where).orderBy(desc(messages.id)).limit(1),
  ]);
  const slug = latest ? (ctx.members.find((m) => m.id === latest.senderId)?.slug ?? "") : "";
  const preview = latest ? (latest.kind === "call" ? "📞 Call" : latest.kind === "media" ? (latest.meta?.attachmentKind === "voice" ? "🎤 Voice note" : "📷 Photo") : latest.body.slice(0, 140)) : "";
  return { unread: n, latest: latest ? { id: latest.id, slug, body: preview } : null };
}

/** Writes a call's outcome into the chat, once per call. */
export async function logCall(ctx: Ctx, call: { id: string; callerId: string; kind: string; outcome: NonNullable<Row["meta"]>["outcome"]; durationSec: number | null }) {
  const db = await getDb();
  await db
    .insert(messages)
    .values({
      coupleId: ctx.relationship.id,
      senderId: call.callerId,
      clientId: `call:${call.id}`,
      kind: "call",
      body: "",
      meta: { callId: call.id, callKind: call.kind === "video" ? "video" : "audio", outcome: call.outcome, durationSec: call.durationSec ?? undefined },
    })
    .onConflictDoNothing({ target: [messages.coupleId, messages.clientId] });
}

/** A phone notification for my partner, unless they're looking at the chat right now. */
async function notifyPartner(ctx: Ctx, m: ChatMessage) {
  const partner = ctx.partner;
  if (!partner) return;
  try {
    const db = await getDb();
    const [[p], [state]] = await Promise.all([
      db.select().from(presence).where(eq(presence.personId, partner.id)),
      db.select().from(chatState).where(eq(chatState.personId, partner.id)),
    ]);
    if (p && p.place === "chat" && Date.now() - p.lastSeenAt.getTime() < 15_000) return;
    // How many of my messages they haven't read yet: the notification title and their app-icon badge.
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.coupleId, ctx.relationship.id), eq(messages.senderId, ctx.me.id), gt(messages.id, state?.lastReadId ?? 0), sql`${messages.deletedAt} is null`, notHiddenFor(partner.id)));
    const first = ctx.me.displayName.split(" ")[0];
    const { pushTo } = await import("@/lib/push/server");
    const preview = m.kind === "media" ? (m.attachment?.kind === "voice" ? "🎤 Voice note" : "📷 Photo") : m.body.slice(0, 180);
    await pushTo([partner.id], { type: "message", title: n > 1 ? `${first} · ${n} new messages` : first, body: preview, url: "/together/chat", tag: "chat", unread: n });
  } catch {
    /* notifications are best-effort */
  }
}
