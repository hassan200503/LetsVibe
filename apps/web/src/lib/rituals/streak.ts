/**
 * The shared streak.
 *
 * A day counts when at least one of your daily rituals was kept on it. It is
 * deliberately forgiving, because a streak that punishes you is a streak you
 * quit: today is never counted as missed while it is still today, and a rhythm
 * that ended yesterday is shown as still alive rather than broken.
 *
 * Everything here is pure and date-string based (YYYY-MM-DD), so it can be
 * reasoned about and tested without a database or a clock.
 */

export type Streak = {
  /** Consecutive kept days ending today — or yesterday, while today is open. */
  current: number;
  /** The longest run you two have ever put together. */
  best: number;
  /** Every day you two have kept, all time within the window you were given. */
  total: number;
  keptToday: boolean;
  /** True when the run lives only because of yesterday: today is still open. */
  atRisk: boolean;
  /** The most recent kept day, or null when there is nothing yet. */
  lastKept: string | null;
};

const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Format alone is not enough: 2026-13-40 parses as NaN. Require a real date. */
const isDay = (day: string) => {
  if (!ISO.test(day)) return false;
  const at = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === day;
};

const toEpochDay = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS);

const fromEpochDay = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** The day before `day`. */
export function dayBefore(day: string): string {
  return fromEpochDay(toEpochDay(day) - 1);
}

/** `count` days ending at `today`, oldest first. */
export function lastDays(today: string, count: number): string[] {
  const end = toEpochDay(today);
  return Array.from({ length: count }, (_, i) => fromEpochDay(end - (count - 1 - i)));
}

/**
 * The streak that a set of kept days describes, as of `today`.
 * Days outside the window you pass in are simply unknown, so a run is capped
 * at the window's length — pass in as much history as you want respected.
 */
export function streakFrom(days: Iterable<string>, today: string): Streak {
  const kept = new Set<string>();
  for (const d of days) if (isDay(d)) kept.add(d);

  const keptToday = kept.has(today);
  const yesterday = dayBefore(today);

  // The run is anchored at today if it was kept, otherwise at yesterday so that
  // a day still in progress never reads as a break.
  const anchor = keptToday ? today : kept.has(yesterday) ? yesterday : null;
  let current = 0;
  if (anchor) {
    let cursor = anchor;
    while (kept.has(cursor)) {
      current += 1;
      cursor = dayBefore(cursor);
    }
  }

  // The longest run ever, over the whole window.
  const sorted = [...kept].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous && dayBefore(day) === previous ? run + 1 : 1;
    previous = day;
    if (run > best) best = run;
  }

  return {
    current,
    best: Math.max(best, current),
    total: kept.size,
    keptToday,
    atRisk: !keptToday && current > 0,
    lastKept: sorted.length ? sorted[sorted.length - 1] : null,
  };
}

/** The same shape, for one ritual instead of the couple. */
export function ritualStreak(days: Iterable<string>, today: string): number {
  return streakFrom(days, today).current;
}

/** Round numbers worth noticing. Missing one costs you nothing. */
export const MILESTONES = [7, 14, 30, 60, 100, 200, 365, 500, 730, 1000] as const;

/** The next round number, so the ring always has somewhere gentle to point. */
export function nextMilestone(current: number): number {
  return MILESTONES.find((m) => m > current) ?? Math.ceil((current + 1) / 1000) * 1000;
}
