/**
 * The public product identity. Keep compatibility identifiers (cookies,
 * localStorage keys, crypto labels) out of this module: those are frozen and
 * documented in docs/adr/002-brand.md.
 */
export const BRAND = {
  name: "Let'sVibe",
  slug: "letsvibe",
  tagline: "A private universe for two.",
  description: "A private space for couples to talk, call, watch and listen together.",
  defaultSpaceName: "Our World",
} as const;
