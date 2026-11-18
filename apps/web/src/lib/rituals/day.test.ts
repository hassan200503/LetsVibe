import { describe, expect, it } from "vitest";
import { dayInZone } from "./day";

describe("dayInZone", () => {
  it("uses the couple's zone rather than UTC", () => {
    // 22:00 UTC is already the next day in Nairobi (UTC+3).
    expect(dayInZone(new Date("2026-11-17T22:00:00Z"), "Africa/Nairobi")).toBe("2026-11-18");
    expect(dayInZone(new Date("2026-11-17T22:00:00Z"), "UTC")).toBe("2026-11-17");
  });

  it("handles zones behind UTC", () => {
    // 02:00 UTC is still the previous evening in New York (UTC-5 in November).
    expect(dayInZone(new Date("2026-11-18T02:00:00Z"), "America/New_York")).toBe("2026-11-17");
  });

  it("is stable across a daylight-saving change", () => {
    expect(dayInZone(new Date("2026-03-08T06:59:59Z"), "America/New_York")).toBe("2026-03-08");
    expect(dayInZone(new Date("2026-03-08T05:00:00Z"), "America/New_York")).toBe("2026-03-08");
  });

  it("falls back to UTC for an unknown zone", () => {
    expect(dayInZone(new Date("2026-11-17T08:30:00Z"), "Not/AZone")).toBe("2026-11-17");
  });
});
