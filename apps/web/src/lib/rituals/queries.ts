import "server-only";
import { and, asc, eq, gte, isNull } from "drizzle-orm";
import type { Ctx } from "@/lib/context";
import { getDb, withSchema } from "@/lib/db/client";
import { ritualChecks, rituals } from "@/lib/db/schema";
import { coupleDay } from "./shared-day";
import { lastDays, streakFrom, type Streak } from "./streak";

/** How far back a streak is allowed to remember. */
const WINDOW = 400;
/** How many days the rhythm grid shows: twelve whole weeks. */
export const RHYTHM_DAYS = 84;

export type RitualView = {
  id: string;
  title: string;
  detail: string | null;
  emoji: string;
  cadence: "daily" | "weekly";
  atTime: string | null;
  /** Kept by me today. */
  mine: boolean;
  /** Slugs of the others who kept it today. */
  theirs: string[];
  keptToday: boolean;
  /** For weekly rituals: kept at any point in the current week. */
  keptThisWeek: boolean;
  /** Consecutive days this one ritual has been kept. */
  streak: number;
  /** Every day kept, all time within the window. */
  total: number;
  /** The last seven days, oldest first, ending today. */
  last7: boolean[];
};

export type RitualsData = {
  today: string;
  streak: Streak;
  rituals: RitualView[];
  /** Kept-ritual counts for the last twelve weeks, oldest first. */
  rhythm: { day: string; kept: number }[];
};

/** Monday-based week start, so "this week" means the same thing to both of you. */
export function weekStart(day: string): string {
  const epoch = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  const weekday = (((epoch + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday
  return new Date((epoch - weekday) * 86_400_000).toISOString().slice(0, 10);
}

export async function readRituals(ctx: Ctx, now: Date): Promise<RitualsData> {
  const today = await coupleDay(ctx.relationship.id, now);
  const days = lastDays(today, WINDOW);
  const windowStart = days[0];

  const { list, checks } = await withSchema(async () => {
    const db = await getDb();
    const [list, checks] = await Promise.all([
      db
        .select()
        .from(rituals)
        .where(and(eq(rituals.relationshipId, ctx.relationship.id), isNull(rituals.archivedAt)))
        .orderBy(asc(rituals.position), asc(rituals.createdAt)),
      db
        .select({ ritualId: ritualChecks.ritualId, day: ritualChecks.day, personId: ritualChecks.personId, cadence: rituals.cadence })
        .from(ritualChecks)
        .innerJoin(rituals, eq(rituals.id, ritualChecks.ritualId))
        .where(and(eq(rituals.relationshipId, ctx.relationship.id), gte(ritualChecks.day, windowStart))),
    ]);
    return { list, checks };
  });

  const slugOf = (id: string) => ctx.members.find((m) => m.id === id)?.slug ?? "";
  const byRitual = new Map<string, { day: string; personId: string }[]>();
  /** Days the couple kept at least one daily ritual: what the shared streak counts. */
  const dailyDays: string[] = [];
  const dayCounts = new Map<string, number>();

  for (const c of checks) {
    const bucket = byRitual.get(c.ritualId);
    if (bucket) bucket.push(c);
    else byRitual.set(c.ritualId, [c]);
    dayCounts.set(c.day, (dayCounts.get(c.day) ?? 0) + 1);
    if (c.cadence === "daily") dailyDays.push(c.day);
  }

  const week = weekStart(today);
  const views: RitualView[] = list.map((r) => {
    const rows = byRitual.get(r.id) ?? [];
    const keptDays = new Set(rows.map((x) => x.day));
    const todayRows = rows.filter((x) => x.day === today);
    return {
      id: r.id,
      title: r.title,
      detail: r.detail,
      emoji: r.emoji,
      cadence: r.cadence === "weekly" ? "weekly" : "daily",
      atTime: r.atTime,
      mine: todayRows.some((x) => x.personId === ctx.me.id),
      theirs: todayRows.filter((x) => x.personId !== ctx.me.id).map((x) => slugOf(x.personId)),
      keptToday: todayRows.length > 0,
      keptThisWeek: rows.some((x) => weekStart(x.day) === week),
      streak: r.cadence === "weekly" ? 0 : streakFrom(keptDays, today).current,
      total: keptDays.size,
      last7: lastDays(today, 7).map((d) => keptDays.has(d)),
    };
  });

  return {
    today,
    streak: streakFrom(dailyDays, today),
    rituals: views,
    rhythm: lastDays(today, RHYTHM_DAYS).map((day) => ({ day, kept: dayCounts.get(day) ?? 0 })),
  };
}
