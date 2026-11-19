import "server-only";
import { cache } from "react";
import { getDb, withSchema } from "@/lib/db/client";
import {
  applyFlagOverride,
  explainFlags,
  flagReader,
  parseAllowlist,
  parseFlagEnv,
  readOverrides,
  resolveFlag,
  resolveFlags,
  type FlagOverride,
  type FlagRow,
  type FlagValues,
  type Flags,
} from "./core";
import { FLAGS, FLAG_KEYS, type FlagKey } from "./registry";

export { FLAGS, FLAG_KEYS };
export type { FlagKey, FlagOverride, FlagRow, Flags };

/**
 * Feature flags, resolved on the server.
 *
 * The browser never gets a say. Nothing here reads a cookie, header, query
 * string or request body, so a client cannot switch a flag on: it can only ask
 * for a page and be given whichever answer the server's own environment and the
 * audited per-couple overrides produce. A flag the server says is off is off for
 * everyone, and unfinished or legally-gated features default to off (registry).
 */

/** The deployment-wide values, read from the environment once per process. */
const deployment = parseFlagEnv(process.env.FEATURE_FLAGS);
const allowlisted = parseAllowlist(process.env.FEATURE_FLAG_ALLOWLIST);

/**
 * Entries in FEATURE_FLAGS / FEATURE_FLAG_ALLOWLIST we could not read. Surfaced
 * by `pnpm flags --config` so a typo is visible instead of silently inert.
 */
export function flagConfigIssues(): string[] {
  return [
    ...deployment.invalid.map((entry) => `FEATURE_FLAGS: ${entry}`),
    ...allowlisted.invalid.map((entry) => `FEATURE_FLAG_ALLOWLIST: ${entry}`),
  ];
}

// The database is the only source that changes without a deploy, so it is the
// only one worth caching. A primary-key select stays off the hot path, and an
// admin change is picked up within the TTL.
const g = globalThis as unknown as { __flagOverrides?: Map<string, { at: number; value: FlagValues }> };
const cacheStore = (g.__flagOverrides ??= new Map());
const TTL = 15_000;

/** Audited per-couple overrides, cached per process. */
export async function overridesFor(coupleId: string): Promise<FlagValues> {
  const hit = cacheStore.get(coupleId);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const db = await getDb();
  const value = await withSchema(() => readOverrides(db, coupleId)).catch((): FlagValues => ({}));
  cacheStore.set(coupleId, { at: Date.now(), value });
  return value;
}

function inputFor(coupleId: string, overrides: FlagValues) {
  return { coupleId, env: deployment.value, allowlist: allowlisted.value, overrides };
}

/** Every flag for one couple. Always pass `ctx.relationship.id`, never input. */
export async function flagsFor(coupleId: string): Promise<Flags> {
  return flagReader(resolveFlags(inputFor(coupleId, await overridesFor(coupleId))));
}

/** The per-request memo, for a page that branches more than once. */
export const cachedFlagsFor = cache(flagsFor);

/** One flag, for the call sites that only need to branch on one. */
export async function flagFor(coupleId: string, key: FlagKey): Promise<boolean> {
  return resolveFlag(key, inputFor(coupleId, await overridesFor(coupleId)));
}

/** A per-flag explanation for the admin tool: the answer and where it came from. */
export async function explainCoupleFlags(coupleId: string): Promise<FlagRow[]> {
  return explainFlags(inputFor(coupleId, await overridesFor(coupleId)));
}

/** Records an audited override. See core.applyFlagOverride for the log shape. */
export async function setFlagOverride(input: FlagOverride): Promise<FlagValues> {
  const db = await getDb();
  const next = await withSchema(() => applyFlagOverride(db, input));
  cacheStore.delete(input.coupleId);
  return next;
}
