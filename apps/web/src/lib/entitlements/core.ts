import { and, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";
import { formatBytes, resetLabel } from "./format";
import type { AiUsage, LimitCheck, Plan, PlanLimits, Usage, UsageSummary } from "./types";

export type EntitlementDb = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Entitlement = typeof schema.entitlements.$inferSelect;

const GB = 1024 * 1024 * 1024;

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { storageBytes: 1 * GB, aiQuestionsPerMonth: 100, rooms: 1, exportsPerMonth: 3 },
  premium: { storageBytes: 25 * GB, aiQuestionsPerMonth: 1500, rooms: 3, exportsPerMonth: 20 },
};

export const PLAN_LABEL: Record<Plan, string> = { free: "Free", premium: "Premium" };

export function limitsOf(row: Entitlement): PlanLimits {
  return {
    storageBytes: Number(row.storageBytes),
    aiQuestionsPerMonth: row.aiQuestionsPerMonth,
    rooms: row.rooms,
    exportsPerMonth: row.exportsPerMonth,
  };
}

export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nextPeriodStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** Creates the free entitlement on first use. Two servers racing is harmless. */
export async function ensureEntitlement(db: EntitlementDb, coupleId: string): Promise<Entitlement> {
  await db.insert(schema.entitlements).values({ coupleId }).onConflictDoNothing();
  const [row] = await db.select().from(schema.entitlements).where(eq(schema.entitlements.coupleId, coupleId));
  if (!row) throw new Error("Could not load this couple's plan");
  return row;
}

async function storageUsed(db: EntitlementDb, coupleId: string): Promise<number> {
  const [[media], [photos]] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${schema.media.bytes}), 0)` })
      .from(schema.media)
      .where(eq(schema.media.relationshipId, coupleId)),
    db
      .select({ total: sql<string>`coalesce(sum(octet_length(${schema.photos.bytes})), 0)` })
      .from(schema.photos)
      .where(eq(schema.photos.relationshipId, coupleId)),
  ]);
  return Number(media?.total ?? 0) + Number(photos?.total ?? 0);
}

async function monthlyUsed(db: EntitlementDb, coupleId: string, metric: "ai_question" | "export", period: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${schema.usageLedger.quantity}), 0)` })
    .from(schema.usageLedger)
    .where(and(eq(schema.usageLedger.coupleId, coupleId), eq(schema.usageLedger.metric, metric), eq(schema.usageLedger.period, period)));
  return Number(row?.total ?? 0);
}

async function monthlyAi(db: EntitlementDb, coupleId: string, period: string): Promise<{ questions: number; tokens: number; costMicros: number }> {
  const [row] = await db
    .select({
      questions: sql<string>`coalesce(sum(${schema.usageLedger.quantity}), 0)`,
      tokens: sql<string>`coalesce(sum(${schema.usageLedger.totalTokens}), 0)`,
      costMicros: sql<string>`coalesce(sum(${schema.usageLedger.costMicros}), 0)`,
    })
    .from(schema.usageLedger)
    .where(
      and(eq(schema.usageLedger.coupleId, coupleId), eq(schema.usageLedger.metric, "ai_question"), eq(schema.usageLedger.period, period)),
    );
  return { questions: Number(row?.questions ?? 0), tokens: Number(row?.tokens ?? 0), costMicros: Number(row?.costMicros ?? 0) };
}

/**
 * Published Gemini rates, in micro-USD per million tokens. Only an estimate
 * for the couple's own key — the provider's bill is the source of truth.
 */
const AI_RATES: { match: RegExp; input: number; output: number }[] = [
  { match: /lite/i, input: 100_000, output: 400_000 },
  { match: /pro/i, input: 1_250_000, output: 10_000_000 },
];
const FLASH_RATE = { input: 300_000, output: 2_500_000 };

export function estimateAiCostMicros(model: string, promptTokens: number, completionTokens: number): number {
  const rate = AI_RATES.find((r) => r.match.test(model)) ?? FLASH_RATE;
  const cost = (Math.max(0, promptTokens) * rate.input + Math.max(0, completionTokens) * rate.output) / 1_000_000;
  return Math.max(0, Math.round(cost));
}

function tokenCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

/**
 * Attaches what a model call actually used to the question reserved for it.
 * Silently does nothing when the reservation is unknown (for example a retry
 * that arrived after the row was cleaned up).
 */
export async function recordAiUsage(db: EntitlementDb, coupleId: string, sourceId: string, usage: AiUsage): Promise<void> {
  const promptTokens = tokenCount(usage.promptTokens);
  const completionTokens = tokenCount(usage.completionTokens);
  const totalTokens = Math.max(tokenCount(usage.totalTokens), promptTokens + completionTokens);
  const model = usage.model.trim().slice(0, 120) || "unknown";
  await db
    .update(schema.usageLedger)
    .set({ model, promptTokens, completionTokens, totalTokens, costMicros: estimateAiCostMicros(model, promptTokens, completionTokens) })
    .where(
      and(
        eq(schema.usageLedger.coupleId, coupleId),
        eq(schema.usageLedger.metric, "ai_question"),
        eq(schema.usageLedger.sourceId, sourceId),
      ),
    );
}

async function roomsUsed(db: EntitlementDb, coupleId: string): Promise<number> {
  const [row] = await db.select({ total: sql<string>`count(*)` }).from(schema.roomState).where(eq(schema.roomState.relationshipId, coupleId));
  return Number(row?.total ?? 0);
}

export async function readUsage(db: EntitlementDb, coupleId: string, now = new Date()): Promise<Usage> {
  const period = currentPeriod(now);
  const [storageBytes, ai, rooms, exports] = await Promise.all([
    storageUsed(db, coupleId),
    monthlyAi(db, coupleId, period),
    roomsUsed(db, coupleId),
    monthlyUsed(db, coupleId, "export", period),
  ]);
  return { storageBytes, aiQuestions: ai.questions, aiTokens: ai.tokens, aiCostMicros: ai.costMicros, rooms, exports };
}

export async function usageSummary(db: EntitlementDb, coupleId: string, now = new Date()): Promise<UsageSummary> {
  const entitlement = await ensureEntitlement(db, coupleId);
  return {
    plan: entitlement.plan,
    limits: limitsOf(entitlement),
    usage: await readUsage(db, coupleId, now),
    resetsAt: nextPeriodStart(now).toISOString(),
  };
}

/** Checks a file against current usage before an upload is authorised. */
export async function checkStorage(db: EntitlementDb, coupleId: string, addBytes: number): Promise<LimitCheck> {
  const [entitlement, used] = await Promise.all([ensureEntitlement(db, coupleId), storageUsed(db, coupleId)]);
  const limit = Number(entitlement.storageBytes);
  const remaining = Math.max(0, limit - used);
  const wanted = Math.max(0, Math.ceil(addBytes));
  if (used + wanted > limit) {
    const detail = remaining > 0 ? `That file needs ${formatBytes(wanted)}, but only ${formatBytes(remaining)} is left.` : "Your shared storage is full.";
    return {
      ok: false,
      used,
      limit,
      remaining,
      error: `${detail} ${formatBytes(used)} of ${formatBytes(limit)} is used — delete a photo, video or song in Gallery to free space.`,
    };
  }
  return { ok: true, used, limit, remaining: limit - used - wanted };
}

/** One fixed Together room today; an override can set `rooms` to 0 to disable it. */
export async function checkRoom(db: EntitlementDb, coupleId: string): Promise<LimitCheck> {
  const [entitlement, used] = await Promise.all([ensureEntitlement(db, coupleId), roomsUsed(db, coupleId)]);
  const limit = entitlement.rooms;
  if (limit < 1) {
    return { ok: false, used, limit, remaining: 0, error: "The Together room isn't included on this plan. Ask support to review your limits." };
  }
  if (used > limit) {
    return { ok: false, used, limit, remaining: 0, error: `This couple already has ${used} rooms, above its limit of ${limit}.` };
  }
  return { ok: true, used, limit, remaining: Math.max(0, limit - used) };
}

/** A model call refused because the couple's monthly AI allowance is spent. */
export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

/**
 * Reserves one monthly AI question before any model call. The entitlement row
 * lock serialises two devices asking at the same moment, so a couple cannot
 * spend past its limit. `sourceId` makes a retried request idempotent.
 */
export async function reserveAiQuestion(
  db: EntitlementDb,
  coupleId: string,
  personId: string,
  sourceId: string,
  now = new Date(),
): Promise<LimitCheck> {
  await ensureEntitlement(db, coupleId);
  const period = currentPeriod(now);
  return db.transaction(async (tx) => {
    const [entitlement] = await tx.select().from(schema.entitlements).where(eq(schema.entitlements.coupleId, coupleId)).for("update");
    if (!entitlement) throw new Error("Could not load this couple's plan");
    const limit = entitlement.aiQuestionsPerMonth;
    const used = await monthlyUsed(tx as EntitlementDb, coupleId, "ai_question", period);
    const [existing] = await tx
      .select({ id: schema.usageLedger.id })
      .from(schema.usageLedger)
      .where(and(eq(schema.usageLedger.coupleId, coupleId), eq(schema.usageLedger.metric, "ai_question"), eq(schema.usageLedger.sourceId, sourceId)))
      .limit(1);
    if (existing) return { ok: true, used, limit, remaining: Math.max(0, limit - used) } satisfies LimitCheck;
    if (used >= limit) {
      return {
        ok: false,
        used,
        limit,
        remaining: 0,
        error: `You've used all ${limit} AI questions this month. Your allowance resets on ${resetLabel(nextPeriodStart(now).toISOString())}.`,
      } satisfies LimitCheck;
    }
    await tx
      .insert(schema.usageLedger)
      .values({ coupleId, metric: "ai_question", period, quantity: 1, sourceId, createdBy: personId })
      .onConflictDoNothing();
    return { ok: true, used: used + 1, limit, remaining: Math.max(0, limit - used - 1) } satisfies LimitCheck;
  });
}

export type EntitlementOverride = {
  coupleId: string;
  actor: string;
  reason: string;
  plan?: Plan;
  storageBytes?: number;
  aiQuestionsPerMonth?: number;
  rooms?: number;
  exportsPerMonth?: number;
};

function integer(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} must be a whole number between ${min} and ${max}`);
  return value;
}

/**
 * Break-glass admin change. There is deliberately no client-callable action:
 * the CLI and trusted server code call this, and every change appends to the
 * append-only audit log with its before and after values.
 */
export async function applyEntitlementOverride(db: EntitlementDb, input: EntitlementOverride): Promise<Entitlement> {
  const actor = input.actor.trim().slice(0, 120);
  const reason = input.reason.trim().slice(0, 500);
  if (!actor) throw new Error("An admin actor is required");
  if (reason.length < 4) throw new Error("A reason of at least 4 characters is required");
  if (input.plan && input.plan !== "free" && input.plan !== "premium") throw new Error("Unknown plan");
  if (
    input.storageBytes === undefined &&
    input.aiQuestionsPerMonth === undefined &&
    input.rooms === undefined &&
    input.exportsPerMonth === undefined &&
    input.plan === undefined
  ) {
    throw new Error("No entitlement changes supplied");
  }

  const before = await ensureEntitlement(db, input.coupleId);
  const plan = input.plan ?? before.plan;
  const defaults = PLAN_LIMITS[plan];
  const storageBytes = input.storageBytes === undefined ? (input.plan ? defaults.storageBytes : Number(before.storageBytes)) : integer(input.storageBytes, "Storage bytes", 1, 1024 * GB);
  const aiQuestionsPerMonth =
    input.aiQuestionsPerMonth === undefined ? (input.plan ? defaults.aiQuestionsPerMonth : before.aiQuestionsPerMonth) : integer(input.aiQuestionsPerMonth, "AI questions", 0, 100_000);
  const rooms = input.rooms === undefined ? (input.plan ? defaults.rooms : before.rooms) : integer(input.rooms, "Rooms", 0, 50);
  const exportsPerMonth = input.exportsPerMonth === undefined ? (input.plan ? defaults.exportsPerMonth : before.exportsPerMonth) : integer(input.exportsPerMonth, "Exports", 0, 1000);

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(schema.entitlements).where(eq(schema.entitlements.coupleId, input.coupleId)).for("update");
    if (!current) throw new Error("Couple not found");
    const [after] = await tx
      .update(schema.entitlements)
      .set({ plan, storageBytes, aiQuestionsPerMonth, rooms, exportsPerMonth, updatedAt: new Date() })
      .where(eq(schema.entitlements.coupleId, input.coupleId))
      .returning();
    await tx.insert(schema.auditLog).values({
      actor,
      action: "entitlement.override",
      targetType: "couple",
      targetId: input.coupleId,
      detail: {
        reason,
        before: { plan: current.plan, ...limitsOf(current) },
        after: { plan: after.plan, ...limitsOf(after) },
      },
    });
    return after;
  });
}
