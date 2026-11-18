/**
 * The day as the couple lives it.
 *
 * A shared day has to be the same on both phones, so it is computed in the
 * couple's own time zone rather than the server's. Dates stay plain
 * `YYYY-MM-DD`, matching the `date` columns they are stored in.
 */
export function dayInZone(now: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: "year" | "month" | "day") => parts.find((p) => p.type === type)?.value;
    const year = get("year");
    const month = get("month");
    const day = get("day");
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // An unknown zone falls back to UTC rather than failing a daily action.
  }
  return now.toISOString().slice(0, 10);
}
