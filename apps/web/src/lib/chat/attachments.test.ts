import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/db/schema";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));
vi.mock("@/lib/auth/session", () => ({ readSession: async () => null }));

const holder = vi.hoisted(() => ({ db: undefined as unknown }));

vi.mock("@/lib/db/client", () => ({
  getDb: async () => holder.db,
  withSchema: async (fn: () => Promise<unknown>) => fn(),
}));

import { ctxFor, type Ctx } from "@/lib/context";
import { applyChat, chatAction } from "@/lib/chat/server";
import { galleryPage, mediaByIds } from "@/lib/media/queries";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let client: PGlite;
let db: Db;

async function person(slug: string) {
  const [row] = await db
    .insert(schema.people)
    .values({ slug, displayName: `${slug} Person`, theme: "us", passwordHash: "not-used-in-chat-tests" })
    .returning();
  return row;
}

async function couple(name: string) {
  const [row] = await db.insert(schema.couples).values({ name }).returning();
  return row;
}

async function seed() {
  const ours = await couple("Ours");
  const theirs = await couple("Theirs");
  const alex = await person("alex");
  const sam = await person("sam");
  const kim = await person("kim");
  await db.insert(schema.coupleMembers).values([
    { coupleId: ours.id, personId: alex.id, slug: "alex", slot: 1 },
    { coupleId: ours.id, personId: sam.id, slug: "sam", slot: 2 },
    { coupleId: theirs.id, personId: kim.id, slug: "kim", slot: 1 },
  ]);
  return { ours, theirs, alex, sam, kim };
}

async function ctxOf(personId: string): Promise<Ctx> {
  const ctx = await ctxFor(personId);
  if (!ctx) throw new Error("expected a context");
  return ctx;
}

async function chatMedia(coupleId: string, addedBy: string, kind: "photo" | "song" = "song") {
  const [row] = await db
    .insert(schema.media)
    .values({
      coupleId,
      addedBy,
      kind,
      source: "upload",
      origin: "chat",
      path: `rel/${coupleId}/song/${crypto.randomUUID()}.webm`,
      mime: kind === "song" ? "audio/webm" : "image/webp",
      durationSec: kind === "song" ? 12 : null,
    })
    .returning();
  return row;
}

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  holder.db = db;
}, 60_000);

beforeEach(async () => {
  await client.exec('TRUNCATE TABLE "couples", "people" RESTART IDENTITY CASCADE');
}, 30_000);

afterAll(async () => {
  await client.close();
});

describe("chat attachments", () => {
  it("sends a voice note with its duration and peaks, and keeps it out of the gallery", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    const file = await chatMedia(s.ours.id, s.alex.id);

    const result = await applyChat(ctx, {
      type: "send",
      clientId: "voice-note-0001",
      body: "",
      attachmentId: file.id,
      peaks: Array.from({ length: 48 }, (_, i) => i / 48),
      replyTo: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok || !result.message) throw new Error("expected a message");
    expect(result.message.kind).toBe("media");
    expect(result.message.attachment).toMatchObject({ id: file.id, kind: "voice", durationSec: 12 });
    expect(result.message.attachment?.url).toContain(`/api/media/file/rel/${s.ours.id}/`);
    expect(result.message.attachment?.peaks).toHaveLength(48);
    expect(result.message.attachment?.width).toBeNull();
    expect(result.message.attachment?.thumbUrl).toBeNull();

    expect(await galleryPage(ctx, {})).toMatchObject({ items: [] });
    expect(await mediaByIds(ctx, [file.id])).toEqual([]);
  });

  it("is idempotent: a retried send returns the same message instead of a second one", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    const file = await chatMedia(s.ours.id, s.alex.id, "photo");

    const first = await applyChat(ctx, { type: "send", clientId: "photo-send-0001", body: "Look", attachmentId: file.id, replyTo: null });
    const retry = await applyChat(ctx, { type: "send", clientId: "photo-send-0001", body: "Look", attachmentId: file.id, replyTo: null });

    expect(first.ok && retry.ok).toBe(true);
    if (!first.ok || !retry.ok) return;
    expect(retry.message?.id).toBe(first.message?.id);
    const rows = await db.select().from(schema.messages).where(eq(schema.messages.coupleId, s.ours.id));
    expect(rows).toHaveLength(1);
  });

  it("refuses an attachment that was already sent in another message", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    const file = await chatMedia(s.ours.id, s.alex.id);

    expect((await applyChat(ctx, { type: "send", clientId: "voice-note-0002", body: "", attachmentId: file.id, replyTo: null })).ok).toBe(true);
    const second = await applyChat(ctx, { type: "send", clientId: "voice-note-0003", body: "", attachmentId: file.id, replyTo: null });
    expect(second).toMatchObject({ ok: false, error: expect.stringMatching(/already sent/) });
  });

  it("refuses another couple's attachment and one uploaded by the partner", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    const theirs = await chatMedia(s.theirs.id, s.kim.id);
    const partners = await chatMedia(s.ours.id, s.sam.id);

    expect((await applyChat(ctx, { type: "send", clientId: "voice-note-0004", body: "", attachmentId: theirs.id, replyTo: null })).ok).toBe(false);
    expect((await applyChat(ctx, { type: "send", clientId: "voice-note-0005", body: "", attachmentId: partners.id, replyTo: null })).ok).toBe(false);
  });

  it("accepts an attachment with no caption but the request schema rejects a message with neither", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    const file = await chatMedia(s.ours.id, s.alex.id, "photo");

    expect(chatAction.safeParse({ type: "send", clientId: "photo-send-0002", body: "", attachmentId: null }).success).toBe(false);
    expect(chatAction.safeParse({ type: "send", clientId: "photo-send-0003", body: "", attachmentId: file.id }).success).toBe(true);
    expect((await applyChat(ctx, { type: "send", clientId: "photo-send-0003", body: "", attachmentId: file.id, replyTo: null })).ok).toBe(true);
  });

  it("deleting for everyone removes the attachment row; deleting for me leaves it for the partner", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    const kept = await chatMedia(s.ours.id, s.alex.id);
    const sent = await applyChat(ctx, { type: "send", clientId: "voice-note-0006", body: "", attachmentId: kept.id, replyTo: null });
    if (!sent.ok || !sent.message) throw new Error("expected a message");

    expect((await applyChat(ctx, { type: "delete", id: sent.message.id, scope: "me" })).ok).toBe(true);
    expect(await db.select().from(schema.media).where(eq(schema.media.id, kept.id))).toHaveLength(1);

    const gone = await chatMedia(s.ours.id, s.alex.id);
    const sentGone = await applyChat(ctx, { type: "send", clientId: "voice-note-0007", body: "", attachmentId: gone.id, replyTo: null });
    if (!sentGone.ok || !sentGone.message) throw new Error("expected a message");
    expect((await applyChat(ctx, { type: "delete", id: sentGone.message.id, scope: "everyone" })).ok).toBe(true);
    expect(await db.select().from(schema.media).where(eq(schema.media.id, gone.id))).toHaveLength(0);
  });

  it("keeps gallery uploads in the gallery and chat uploads out of it", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    const [galleryItem] = await db
      .insert(schema.media)
      .values({ coupleId: s.ours.id, addedBy: s.alex.id, kind: "photo", source: "upload", path: `rel/${s.ours.id}/photo/x.webp`, mime: "image/webp" })
      .returning();
    const chatItem = await chatMedia(s.ours.id, s.alex.id, "photo");

    expect((await galleryPage(ctx, {})).items.map((m) => m.id)).toEqual([galleryItem.id]);
    expect((await mediaByIds(ctx, [chatItem.id])).map((m) => m.id)).toEqual([]);
    expect((await mediaByIds(ctx, [galleryItem.id])).map((m) => m.id)).toEqual([galleryItem.id]);
  });
});
