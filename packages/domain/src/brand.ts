/**
 * The public product identity. Compatibility identifiers (cookies, storage
 * keys, crypto labels) are deliberately branded too; see docs/adr/004-lovora.md.
 */
export const BRAND = {
  name: "Lovora",
  slug: "lovora",
  tagline: "A private world for two.",
  description: "A private shared world for couples to talk, call, watch and listen together.",
  defaultSpaceName: "Our World",
} as const;
