/**
 * Accessible visual identities. A theme changes colour only; it never carries
 * a person's name, vocabulary or private data.
 */
export const THEME_KEYS = ["us", "indigo", "sage"] as const;

export type ThemeKey = (typeof THEME_KEYS)[number];

export const THEME_OPTIONS: { value: ThemeKey; label: string; description: string }[] = [
  { value: "us", label: "Rose & gold", description: "Warm, shared and celebratory" },
  { value: "indigo", label: "Indigo & teal", description: "Cool, focused and technical" },
  { value: "sage", label: "Sage & lavender", description: "Soft, organic and natural" },
];

export function isThemeKey(value: string): value is ThemeKey {
  return (THEME_KEYS as readonly string[]).includes(value);
}

/** Existing rows from older builds fall back to the shared palette. */
export function coerceTheme(value: string | null | undefined): ThemeKey {
  return value && isThemeKey(value) ? value : "us";
}
