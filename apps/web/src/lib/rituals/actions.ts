"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, gte, isNull } from "drizzle-orm";
import { requireCtx } from "@/lib/context";
import { getDb } from "@/lib/db/client";
import { ritualChecks, rituals, roomEvents } from "@/lib/db/schema";
import { coupleDay } from "./shared-day";
import { lastDays, streakFrom } from "./streak";

const MAX_RITUALS = 12;
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

const touch = () => {
  revalidatePath("/together/rituals");
  revalidatePath("/together");
  revalidatePath("/");
};

/**
 * Keep a ritual for today, or take the tap back. A day is kept for both of you
 * as soon as one of you taps, so the other never has to be chased.
 */
export async function toggleRitual(ritualId: string): Promise<{ ok: boolean; kept?: boolean; error?: string }> {
  const ctx = await requireCtx();
  const db = await getDb();
  const [ritual] = await db
    .select()
    .from(rituals)
    .where(and(eq(rituals.id, ritualId), eq(rituals.coupleId, ctx.relationship.id), isNull(rituals.archivedAt)));
  if (!ritual) return { ok: false, error: "That ritual isn't here any more" };

  const day = await coupleDay(ctx.relationship.id, new Date());
  const where = and(eq(ritualChecks.ritualId, ritualId), eq(ritualChecks.day, day), eq(ritualChecks.personId, ctx.me.id));
  const [mine] = await db.select({ personId: ritualChecks.personId }).from(ritualChecks).where(where);

  if (mine) {
    await db.delete(ritualChecks).where(where);
    touch();
    return { ok: true, kept: false };
  }

  await db.insert(ritualChecks).values({ ritualId, coupleId: ctx.relationship.id, day, personId: ctx.me.id }).onConflictDoNothing();
  await db
    .insert(roomEvents)
    .values({ coupleId: ctx.relationship.id, personId: ctx.me.id, kind: "system", body: `kept “${ritual.title}” ${ritual.emoji} — your turn, or just smile` })
    .catch(() => undefined);

  // A gentle milestone note the first time a run reaches a round number.
  const rows = await db
    .select({ day: ritualChecks.day })
    .from(ritualChecks)
    .innerJoin(rituals, eq(rituals.id, ritualChecks.ritualId))
    .where(and(eq(rituals.coupleId, ctx.relationship.id), eq(rituals.cadence, "daily"), gte(ritualChecks.day, lastDays(day, 400)[0])))
    .catch(() => []);
  const streak = streakFrom(rows.map((r) => r.day), day).current;
  if (streak > 1 && streak % 30 === 0) {
    await db
      .insert(roomEvents)
      .values({ coupleId: ctx.relationship.id, personId: ctx.me.id, kind: "system", body: `${streak} days of your rhythm, without a single day of pressure 💛` })
      .catch(() => undefined);
  }

  touch();
  return { ok: true, kept: true };
}

/** Start a new ritual. A few taps, and it appears on both your phones. */
export async function createRitual(_: unknown, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireCtx();
  const title = String(fd.get("title") ?? "").trim().slice(0, 80);
  const detail = String(fd.get("detail") ?? "").trim().slice(0, 240) || null;
  const emoji = String(fd.get("emoji") ?? "✷").trim().slice(0, 4) || "✷";
  const cadence = String(fd.get("cadence") ?? "daily") === "weekly" ? "weekly" : "daily";
  const rawTime = String(fd.get("atTime") ?? "").trim();
  const atTime = TIME.test(rawTime) ? rawTime : null;
  if (!title) return { error: "Give the ritual a name" };

  const db = await getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(rituals)
    .where(and(eq(rituals.coupleId, ctx.relationship.id), isNull(rituals.archivedAt)));
  if (Number(n) >= MAX_RITUALS) return { error: `Twelve rituals is the most that stays a rhythm rather than a list` };

  await db.insert(rituals).values({
    coupleId: ctx.relationship.id,
    createdBy: ctx.me.id,
    title,
    detail,
    emoji,
    cadence,
    atTime,
    position: Number(n),
  });
  touch();
  return { ok: true };
}

/** Put a ritual away. Its days stay kept, so the streak is never punished. */
export async function archiveRitual(ritualId: string): Promise<{ ok: boolean }> {
  const ctx = await requireCtx();
  const db = await getDb();
  await db
    .update(rituals)
    .set({ archivedAt: new Date() })
    .where(and(eq(rituals.id, ritualId), eq(rituals.coupleId, ctx.relationship.id), isNull(rituals.archivedAt)));
  touch();
  return { ok: true };
}

/** Keep everything for today in one tap — the "we had a full day" shortcut. */
export async function keepAllToday(ids: string[]): Promise<{ ok: boolean; kept: number }> {
  const ctx = await requireCtx();
  const day = await coupleDay(ctx.relationship.id, new Date());
  const db = await getDb();
  const mine = await db
    .select({ id: rituals.id })
    .from(rituals)
    .where(and(eq(rituals.coupleId, ctx.relationship.id), isNull(rituals.archivedAt)));
  const allowed = new Set(mine.map((r) => r.id));
  const wanted = ids.filter((id) => allowed.has(id));
  if (!wanted.length) return { ok: true, kept: 0 };
  await db.insert(ritualChecks).values(wanted.map((ritualId) => ({ ritualId, coupleId: ctx.relationship.id, day, personId: ctx.me.id }))).onConflictDoNothing();
  touch();
  return { ok: true, kept: wanted.length };
}
