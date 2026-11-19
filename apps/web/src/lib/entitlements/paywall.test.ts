import { describe, expect, it } from "vitest";
import { comparePlans } from "./paywall";

const GB = 1024 * 1024 * 1024;

const free = { storageBytes: 1 * GB, aiQuestionsPerMonth: 100, rooms: 1, exportsPerMonth: 3 };
const premium = { storageBytes: 25 * GB, aiQuestionsPerMonth: 1500, rooms: 3, exportsPerMonth: 20 };

describe("comparePlans", () => {
  it("takes every value from the limits it is given", () => {
    const rows = comparePlans(free, premium);
    expect(rows.map((r) => [r.key, r.current, r.target])).toEqual([
      ["storage", "1 GB", "25 GB"],
      ["ai", "100", "1500"],
      ["rooms", "1", "3"],
      ["exports", "3", "20"],
    ]);
    expect(rows.every((r) => r.grows)).toBe(true);
  });

  it("reflects an audited override instead of a marketing number", () => {
    const overridden = { storageBytes: 7 * GB, aiQuestionsPerMonth: 42, rooms: 0, exportsPerMonth: 1 };
    const rows = comparePlans(overridden, premium);
    expect(rows[0].current).toBe("7 GB");
    expect(rows[1].current).toBe("42");
    expect(rows[2].current).toBe("Not included");
    expect(rows[3].current).toBe("1");
  });

  it("does not claim a benefit when the target is not larger", () => {
    const rows = comparePlans(premium, premium);
    expect(rows.every((r) => !r.grows)).toBe(true);
    expect(comparePlans(premium, free).every((r) => !r.grows)).toBe(true);
  });

  it("contains no price or currency", () => {
    const text = JSON.stringify(comparePlans(free, premium));
    expect(text).not.toMatch(/\$|€|£|price|usd|per month/i);
  });
});
