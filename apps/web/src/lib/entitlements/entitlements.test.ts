import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import path from "node:path";
import * as schema from "../db/schema";
import { applyEntitlementOverride, checkRoom, checkStorage, ensureEntitlement, estimateAiCostMicros, recordAiUsage, reserveAiQuestion, usageSummary } from "./core";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const GB = 1024 * 1024 * 1024;
const NOW = new Date("2026-11-17T12:00:00.000Z");

let client: PGlite;
let db: Db;

async function person(name: string) {
  const [row] = await db
    .insert(schema.people)
    .values({ slug: name, displayName: name, theme: "us", passwordHash: "not-used-in-tests" })
    .returning();
  return row;
}

async function couple(name: string) {
  const [row] = await db.insert(schema.couples).values({ name }).returning();
  return row;
}

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}, 60_000);

beforeEach(async () => {
  await client.exec(
    'TRUNCATE TABLE "audit_log", "usage_ledger", "entitlements", "room_state", "media", "photos", "couples", "people" RESTART IDENTITY CASCADE',
  );
}, 30_000);

afterAll(async () => {
  await client.close();
});

describe("entitlements", () => {
  it("creates a free entitlement with monthly usage and a UTC reset", async () => {
    const c = await couple("Plans");
    const row = await ensureEntitlement(db, c.id);
    expect(row.plan).toBe("free");
    expect(Number(row.storageBytes)).toBe(GB);
    expect(row.aiQuestionsPerMonth).toBe(100);
    expect(row.rooms).toBe(1);
    expect(row.exportsPerMonth).toBe(3);

    const summary = await usageSummary(db, c.id, NOW);
    expect(summary.plan).toBe("free");
    expect(summary.usage).toEqual({ storageBytes: 0, aiQuestions: 0, aiTokens: 0, aiCostMicros: 0, rooms: 0, exports: 0 });
    expect(summary.resetsAt).toBe("2026-12-01T00:00:00.000Z");
  });

  it("counts uploads and legacy base64 photos towards storage", async () => {
    const c = await couple("Storage");
    const p = await person("storage-uploader");
    await ensureEntitlement(db, c.id);
    await db.insert(schema.media).values({ coupleId: c.id, addedBy: p.id, kind: "video", source: "upload", bytes: 1000 });
    const base64 = Buffer.alloc(2048, 1).toString("base64");
    await db.insert(schema.photos).values({ coupleId: c.id, uploadedBy: p.id, mime: "image/jpeg", bytes: base64 });

    const used = 1000 + Buffer.byteLength(base64);
    const summary = await usageSummary(db, c.id, NOW);
    expect(summary.usage.storageBytes).toBe(used);

    const fits = await checkStorage(db, c.id, GB - used);
    expect(fits.ok).toBe(true);
    expect(fits.remaining).toBe(0);

    const tooMuch = await checkStorage(db, c.id, GB - used + 1);
    expect(tooMuch.ok).toBe(false);
    if (tooMuch.ok) throw new Error("expected the upload to be denied");
    expect(tooMuch.remaining).toBe(GB - used);
    expect(tooMuch.error).toContain("delete a photo, video or song");
  });

  it("reserves AI questions up to the monthly limit and is idempotent by source", async () => {
    const c = await couple("AI");
    const p = await person("ai-asker");
    await ensureEntitlement(db, c.id);
    await db.update(schema.entitlements).set({ aiQuestionsPerMonth: 2 }).where(eq(schema.entitlements.coupleId, c.id));

    expect(await reserveAiQuestion(db, c.id, p.id, "research:one", NOW)).toMatchObject({ ok: true, used: 1, limit: 2, remaining: 1 });
    expect(await reserveAiQuestion(db, c.id, p.id, "research:two", NOW)).toMatchObject({ ok: true, used: 2, limit: 2, remaining: 0 });
    const full = await reserveAiQuestion(db, c.id, p.id, "research:three", NOW);
    expect(full.ok).toBe(false);
    if (full.ok) throw new Error("expected the question to be denied");
    expect(full.used).toBe(2);
    expect(full.error).toContain("resets on 1 Dec");

    const again = await reserveAiQuestion(db, c.id, p.id, "research:two", NOW);
    expect(again.ok).toBe(true);
    const rows = await db.select().from(schema.usageLedger).where(eq(schema.usageLedger.coupleId, c.id));
    expect(rows).toHaveLength(2);
    expect((await usageSummary(db, c.id, NOW)).usage.aiQuestions).toBe(2);
  });

  it("records tokens and estimated cost against the reserved call, and never across couples", async () => {
    const c = await couple("Metering");
    const other = await couple("Elsewhere");
    const p = await person("meter-reader");
    await ensureEntitlement(db, c.id);
    await ensureEntitlement(db, other.id);
    await reserveAiQuestion(db, c.id, p.id, "research:metered", NOW);
    await recordAiUsage(db, c.id, "research:metered", { model: "gemini-2.5-flash", promptTokens: 1000, completionTokens: 400, totalTokens: 1800 });

    const metered = await usageSummary(db, c.id, NOW);
    expect(metered.usage.aiQuestions).toBe(1);
    expect(metered.usage.aiTokens).toBe(1800);
    // 1,000 input × $0.30/M + 400 output × $2.50/M = $0.0013.
    expect(metered.usage.aiCostMicros).toBe(1300);
    expect(metered.usage.aiCostMicros).toBe(estimateAiCostMicros("gemini-2.5-flash", 1000, 400));

    // The same source id under another couple changes nothing there.
    await recordAiUsage(db, other.id, "research:metered", { model: "gemini-2.5-flash", promptTokens: 9999, completionTokens: 9999, totalTokens: 19998 });
    expect((await usageSummary(db, other.id, NOW)).usage.aiTokens).toBe(0);

    // Thinking counts as output, and a lighter model is cheaper for identical traffic.
    expect(estimateAiCostMicros("gemini-flash-lite-latest", 1000, 400)).toBeLessThan(estimateAiCostMicros("gemini-2.5-flash", 1000, 400));
    expect(estimateAiCostMicros("gemini-2.5-pro", 1000, 400)).toBeGreaterThan(estimateAiCostMicros("gemini-2.5-flash", 1000, 400));
  });

  it("disables the Together room when the limit is zero", async () => {
    const c = await couple("Rooms");
    await ensureEntitlement(db, c.id);
    expect((await checkRoom(db, c.id)).ok).toBe(true);
    await db.update(schema.entitlements).set({ rooms: 0 }).where(eq(schema.entitlements.coupleId, c.id));
    const denied = await checkRoom(db, c.id);
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error("expected the room to be denied");
    expect(denied.error).toContain("isn't included");
  });

  it("writes before and after values to the audit log, which rejects edits", async () => {
    const c = await couple("Audit");
    await ensureEntitlement(db, c.id);
    const after = await applyEntitlementOverride(db, {
      coupleId: c.id,
      actor: "ops:test",
      reason: "Support request",
      plan: "premium",
      aiQuestionsPerMonth: 2000,
    });
    expect(after.plan).toBe("premium");
    expect(Number(after.storageBytes)).toBe(25 * GB);
    expect(after.aiQuestionsPerMonth).toBe(2000);

    const [entry] = await db.select().from(schema.auditLog);
    expect(entry.actor).toBe("ops:test");
    expect(entry.action).toBe("entitlement.override");
    expect(entry.targetId).toBe(c.id);
    const detail = entry.detail as { reason: string; before: { plan: string; aiQuestionsPerMonth: number }; after: { plan: string; aiQuestionsPerMonth: number } };
    expect(detail.reason).toBe("Support request");
    expect(detail.before).toMatchObject({ plan: "free", aiQuestionsPerMonth: 100 });
    expect(detail.after).toMatchObject({ plan: "premium", aiQuestionsPerMonth: 2000 });

    await expect(db.update(schema.auditLog).set({ actor: "someone-else" })).rejects.toThrow();
    await expect(db.delete(schema.auditLog)).rejects.toThrow();
    expect(await db.select().from(schema.auditLog)).toHaveLength(1);
  });

  it("requires an actor, a reason and an actual change", async () => {
    const c = await couple("Validation");
    await expect(applyEntitlementOverride(db, { coupleId: c.id, actor: " ", reason: "Support request", plan: "premium" })).rejects.toThrow("actor");
    await expect(applyEntitlementOverride(db, { coupleId: c.id, actor: "ops:test", reason: "no", plan: "premium" })).rejects.toThrow("reason");
    await expect(applyEntitlementOverride(db, { coupleId: c.id, actor: "ops:test", reason: "Support request" })).rejects.toThrow("No entitlement changes");
    await expect(
      applyEntitlementOverride(db, { coupleId: c.id, actor: "ops:test", reason: "Support request", aiQuestionsPerMonth: -1 }),
    ).rejects.toThrow("AI questions");
  });
});
