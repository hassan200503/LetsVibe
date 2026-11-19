/**
 * The flags we ship behind. Every entry is a promise: until its `enabledWhen`
 * is true we have not finished the work it gates, so the default is off.
 *
 * Adding a flag here is deliberate: `default` is the only value a fresh
 * deployment ever gets, and the resolver (./core.ts) can only turn one on from
 * the server's own environment or an audited per-couple override.
 */
export const FLAGS = {
  paywall: {
    default: false,
    purpose: "Charging for Premium (checkout, receipts, entitlement sync).",
    enabledWhen: "billing is live and refunds are documented.",
  },
  licensedCatalogue: {
    default: false,
    purpose: "Licensed music and film in the Together room.",
    enabledWhen: "the catalogue licences are signed (MASTER_SPEC G1).",
  },
  screenShare: {
    default: false,
    purpose: "Sharing a screen into a call.",
    enabledWhen: "the capture path works on both phones.",
  },
  syncTransportV2: {
    default: false,
    purpose: "The replacement sync transport for the Together room.",
    enabledWhen: "the new transport has passed a soak on staging.",
  },
  publicCommons: {
    default: false,
    purpose: "Publishing to the public couples commons.",
    enabledWhen: "the second visibility gate, reporting and moderation exist.",
  },
} as const;

export type FlagKey = keyof typeof FLAGS;

export type FlagSpec = (typeof FLAGS)[FlagKey];

export const FLAG_KEYS = Object.keys(FLAGS) as FlagKey[];

/** Type guard for env input: anything not in the registry is a typo, not a flag. */
export function isFlagKey(value: string): value is FlagKey {
  return Object.prototype.hasOwnProperty.call(FLAGS, value);
}
