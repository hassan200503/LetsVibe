/**
 * One taxonomy for everything kept in Our Story. Writes validate against it and
 * every surface reads its label, icon and description from here, so a post can
 * only ever be filed as one kind and never shows up under the wrong name.
 */

export const STORY_KIND_VALUES = ["memory", "milestone", "adventure", "plan", "discovery"] as const;

export type StoryKind = (typeof STORY_KIND_VALUES)[number];

export type StoryKindMeta = {
  kind: StoryKind;
  /** Singular noun used on a single post. */
  label: string;
  /** Plural noun used for a tab or a filtered view. */
  plural: string;
  icon: string;
  /** What belongs here, shown in the composer so the choice is unambiguous. */
  description: string;
};

export const STORY_KINDS: readonly StoryKindMeta[] = [
  { kind: "memory", label: "Memory", plural: "Memories", icon: "❤️", description: "A moment we want to keep." },
  { kind: "milestone", label: "Milestone", plural: "Milestones", icon: "🌹", description: "A step that changed us." },
  { kind: "adventure", label: "Adventure", plural: "Adventures", icon: "🧭", description: "Somewhere we went, or something we tried together." },
  { kind: "plan", label: "Plan", plural: "Plans", icon: "🗺️", description: "Something still ahead of us." },
  { kind: "discovery", label: "Discovery", plural: "Discoveries", icon: "✨", description: "Something one of us found and wanted to share." },
];

const BY_KIND = new Map<StoryKind, StoryKindMeta>(STORY_KINDS.map((k) => [k.kind, k]));
const FALLBACK = BY_KIND.get("memory")!;

export function isStoryKind(value: unknown): value is StoryKind {
  return typeof value === "string" && BY_KIND.has(value as StoryKind);
}

/** Metadata for a stored kind; a legacy row falls back to a memory rather than rendering unlabelled. */
export function storyKindMeta(kind: string): StoryKindMeta {
  return BY_KIND.get(kind as StoryKind) ?? FALLBACK;
}

export function storyKindCounts(kinds: Iterable<string>): Record<StoryKind, number> {
  const counts = Object.fromEntries(STORY_KIND_VALUES.map((k) => [k, 0])) as Record<StoryKind, number>;
  for (const kind of kinds) counts[storyKindMeta(kind).kind] += 1;
  return counts;
}

export type MonthGroup<T> = { label: string; items: T[] };

/** Chronological groups ("November 2026") that keep the incoming order. */
export function groupByMonth<T>(items: readonly T[], monthOf: (item: T) => string): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  const byLabel = new Map<string, MonthGroup<T>>();
  for (const item of items) {
    const label = new Date(monthOf(item)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    let group = byLabel.get(label);
    if (!group) {
      group = { label, items: [] };
      byLabel.set(label, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
