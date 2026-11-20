import { describe, expect, it } from "vitest";

import { groupByMonth, isStoryKind, STORY_KIND_VALUES, STORY_KINDS, storyKindCounts, storyKindMeta } from "./kinds";

describe("story kinds", () => {
  it("has exactly one complete metadata entry per kind, in display order", () => {
    expect(STORY_KINDS.map((k) => k.kind)).toEqual([...STORY_KIND_VALUES]);
    expect(new Set(STORY_KIND_VALUES).size).toBe(STORY_KIND_VALUES.length);
    for (const k of STORY_KINDS) {
      expect(k.label.length).toBeGreaterThan(0);
      expect(k.plural.length).toBeGreaterThan(0);
      expect(k.icon.length).toBeGreaterThan(0);
      expect(k.description.length).toBeGreaterThan(0);
    }
  });

  it("accepts only the five known kinds", () => {
    for (const k of STORY_KIND_VALUES) expect(isStoryKind(k)).toBe(true);
    for (const bad of ["", "memories", "Plan", "note", " ", null, 3, {}]) expect(isStoryKind(bad)).toBe(false);
  });

  it("labels a legacy row instead of dropping it", () => {
    expect(storyKindMeta("memory").label).toBe("Memory");
    expect(storyKindMeta("something-old").label).toBe("Memory");
  });

  it("counts every post under exactly one category", () => {
    const counts = storyKindCounts(["memory", "memory", "milestone", "adventure", "plan", "discovery", "discovery"]);
    expect(counts).toEqual({ memory: 2, milestone: 1, adventure: 1, plan: 1, discovery: 2 });
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(7);
  });

  it("groups a timeline by month without reordering it", () => {
    const rows = [
      { id: "a", occurredOn: "2026-11-20" },
      { id: "b", occurredOn: "2026-11-02" },
      { id: "c", occurredOn: "2026-01-01" },
      { id: "d", occurredOn: "2025-12-31" },
    ];
    const groups = groupByMonth(rows, (r) => r.occurredOn);
    expect(groups.map((g) => g.label)).toEqual(["November 2026", "January 2026", "December 2025"]);
    expect(groups[0].items.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
