import { describe, expect, it } from "vitest";
import { dayBefore, lastDays, nextMilestone, streakFrom } from "./streak";

describe("dayBefore", () => {
  it("steps back a day", () => {
    expect(dayBefore("2026-11-18")).toBe("2026-11-17");
  });

  it("crosses month and year boundaries", () => {
    expect(dayBefore("2026-12-01")).toBe("2026-11-30");
    expect(dayBefore("2027-01-01")).toBe("2026-12-31");
    expect(dayBefore("2028-03-01")).toBe("2028-02-29");
  });
});

describe("lastDays", () => {
  it("ends on today and is oldest first", () => {
    expect(lastDays("2026-11-18", 3)).toEqual(["2026-11-16", "2026-11-17", "2026-11-18"]);
  });
});

describe("streakFrom", () => {
  const today = "2026-11-18";

  it("counts a run that includes today", () => {
    const s = streakFrom(["2026-11-16", "2026-11-17", today], today);
    expect(s.current).toBe(3);
    expect(s.keptToday).toBe(true);
    expect(s.atRisk).toBe(false);
    expect(s.best).toBe(3);
    expect(s.total).toBe(3);
    expect(s.lastKept).toBe(today);
  });

  it("keeps the run alive while today is still open, and flags it at risk", () => {
    const s = streakFrom(["2026-11-16", "2026-11-17"], today);
    expect(s.current).toBe(2);
    expect(s.keptToday).toBe(false);
    expect(s.atRisk).toBe(true);
  });

  it("breaks the run once a whole day has passed with nothing kept", () => {
    const s = streakFrom(["2026-11-15", "2026-11-16"], today);
    expect(s.current).toBe(0);
    expect(s.atRisk).toBe(false);
    expect(s.best).toBe(2);
    expect(s.lastKept).toBe("2026-11-16");
  });

  it("remembers the longest run even after the current one breaks", () => {
    const s = streakFrom(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-16"], today);
    expect(s.current).toBe(0);
    expect(s.best).toBe(4);
    expect(s.total).toBe(5);
  });

  it("is empty when nothing has ever been kept", () => {
    const s = streakFrom([], today);
    expect(s).toEqual({ current: 0, best: 0, total: 0, keptToday: false, atRisk: false, lastKept: null });
  });

  it("ignores duplicate and malformed days", () => {
    const s = streakFrom([today, today, "not-a-day", "", "2026-13-40"], today);
    expect(s.current).toBe(1);
    expect(s.total).toBe(1);
  });

  it("handles a single day kept today", () => {
    const s = streakFrom([today], today);
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
    expect(s.atRisk).toBe(false);
  });

  it("handles a long unbroken run", () => {
    const days = lastDays(today, 120);
    const s = streakFrom(days, today);
    expect(s.current).toBe(120);
    expect(s.best).toBe(120);
  });
});

describe("nextMilestone", () => {
  it("points at the next round number", () => {
    expect(nextMilestone(0)).toBe(7);
    expect(nextMilestone(7)).toBe(14);
    expect(nextMilestone(29)).toBe(30);
    expect(nextMilestone(1000)).toBe(2000);
  });
});
