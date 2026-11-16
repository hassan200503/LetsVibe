/**
 * Vocabulary for a person's learning world. The data model is optional and
 * generic: every person chooses their own interests, sections and titles.
 */
export type WorldConfig = {
  journalKinds: { value: string; label: string }[];
  thinkingKinds?: { value: string; label: string }[];
  vaultKinds: { value: string; label: string }[];
  tagline: string;
};

const VAULT = [
  { value: "article", label: "Article" },
  { value: "note", label: "Note" },
  { value: "concept", label: "Concept" },
  { value: "idea", label: "Idea" },
  { value: "question", label: "Question" },
  { value: "resource", label: "Resource" },
  { value: "discovery", label: "Discovery" },
];

const GENERIC: WorldConfig = {
  tagline: "Keep learning.",
  journalKinds: [
    { value: "learned", label: "Something I learned" },
    { value: "resource", label: "Book / resource" },
    { value: "question", label: "Question to research" },
    { value: "goal", label: "Goal" },
    { value: "idea", label: "Idea" },
  ],
  vaultKinds: VAULT,
};

export function worldFor(): WorldConfig {
  return GENERIC;
}

export function kindLabel(kinds: { value: string; label: string }[], v: string): string {
  return kinds.find((k) => k.value === v)?.label ?? v;
}
