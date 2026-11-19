import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";
import { FLAGS, FLAG_KEYS, isFlagKey, type FlagKey } from "./registry";

export type FlagDb = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Flags turned on or off deployment-wide. */
export type FlagValues = Partial<Record<FlagKey, boolean>>;

/** Couple ids that may use a flag while its deployment-wide value is off. */
export type Allowlist = Partial<Record<FlagKey, readonly string[]>>;

export type FlagInput = {
  /** The couple asking, always taken from the verified session — never a request parameter. */
  coupleId: string;
  /** `FEATURE_FLAGS`, parsed. Deployment-wide. */
  env?: FlagValues;
  /** `FEATURE_FLAG_ALLOWLIST`, parsed. The staging couple's door. */
  allowlist?: Allowlist;
  /** Audited per-couple overrides from the database, already resolved for this couple. */
  overrides?: FlagValues;
};

/** A resolved set of flags. Reads only; there is no client-writable path. */
export type Flags = {
  is(key: FlagKey): boolean;
  enabled(): FlagKey[];
};

/** Where a flag's answer came from, which is what an operator needs to know. */
export type FlagSource = "default" | "environment" | "allowlist" | "override" | "kill-switch";

export type FlagRow = { key: FlagKey; on: boolean; source: FlagSource; default: boolean };

/**
 * The one precedence rule, highest first:
 *
 * 1. `FEATURE_FLAGS=<key>=off` — an absolute kill switch. Nothing, including an
 *    audited override, turns a killed flag back on.
 * 2. An audited per-couple override.
 * 3. `FEATURE_FLAGS=<key>=on` — on for everyone.
 * 4. `FEATURE_FLAG_ALLOWLIST` — on for one couple, which is how a flag reaches
 *    staging before it reaches users.
 * 5. The registry default, which is off until the work is genuinely finished.
 */
export function resolveFlag(key: FlagKey, input: FlagInput): boolean {
  const deployment = input.env?.[key];
  if (deployment === false) return false;
  const override = input.overrides?.[key];
  if (override !== undefined) return override;
  if (deployment === true) return true;
  if (input.allowlist?.[key]?.includes(input.coupleId)) return true;
  return FLAGS[key].default;
}

export function resolveFlags(input: FlagInput): Record<FlagKey, boolean> {
  const values = {} as Record<FlagKey, boolean>;
  for (const key of FLAG_KEYS) values[key] = resolveFlag(key, input);
  return values;
}

export function flagReader(values: Record<FlagKey, boolean>): Flags {
  return {
    is: (key) => values[key],
    enabled: () => FLAG_KEYS.filter((key) => values[key]),
  };
}

function flagSource(key: FlagKey, input: FlagInput): FlagSource {
  if (input.env?.[key] === false) return "kill-switch";
  if (input.overrides?.[key] !== undefined) return "override";
  if (input.env?.[key] === true) return "environment";
  if (input.allowlist?.[key]?.includes(input.coupleId)) return "allowlist";
  return "default";
}

/** A per-flag explanation for the admin tool. Never exposes a secret. */
export function explainFlags(input: FlagInput): FlagRow[] {
  return FLAG_KEYS.map((key) => ({
    key,
    on: resolveFlag(key, input),
    source: flagSource(key, input),
    default: FLAGS[key].default,
  }));
}

function parseOnOff(raw: string): boolean | undefined {
  const value = raw.trim().toLowerCase();
  if (["on", "true", "1", "yes"].includes(value)) return true;
  if (["off", "false", "0", "no"].includes(value)) return false;
  return undefined;
}

export type Parsed<T> = { value: T; invalid: string[] };

/**
 * `FEATURE_FLAGS="paywall=on,screenShare=off"`.
 *
 * Anything we cannot read is collected rather than applied, so a typo is
 * reported by the admin tool instead of quietly leaving a flag off.
 */
export function parseFlagEnv(raw: string | undefined): Parsed<FlagValues> {
  const value: FlagValues = {};
  const invalid: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    const entry = part.trim();
    if (!entry) continue;
    const [name, ...rest] = entry.split("=");
    const key = (name ?? "").trim();
    const parsed = parseOnOff(rest.join("="));
    if (!isFlagKey(key) || parsed === undefined) {
      invalid.push(entry);
      continue;
    }
    value[key] = parsed;
  }
  return { value, invalid };
}

/**
 * `FEATURE_FLAG_ALLOWLIST="paywall:8f1c…,4a02…"`, or add a second flag with
 * `"paywall:8f1c…;screenShare:4a02…"`.
 */
export function parseAllowlist(raw: string | undefined): Parsed<Allowlist> {
  const value: Allowlist = {};
  const invalid: string[] = [];
  for (const entry of (raw ?? "").split(";")) {
    const item = entry.trim();
    if (!item) continue;
    const at = item.indexOf(":");
    const key = at === -1 ? item : item.slice(0, at).trim();
    if (!isFlagKey(key)) {
      invalid.push(item);
      continue;
    }
    const ids = item
      .slice(at + 1)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      invalid.push(item);
      continue;
    }
    value[key] = [...new Set([...(value[key] ?? []), ...ids])];
  }
  return { value, invalid };
}

/** A couple's overrides live in one row, so reading them is one primary-key select. */
export function overrideKey(coupleId: string): string {
  return `flags:couple:${coupleId}`;
}

/** Keeps only the entries we can trust: a known flag key and a real boolean. */
export function cleanOverrides(value: unknown): FlagValues {
  const out: FlagValues = {};
  if (!value || typeof value !== "object") return out;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (isFlagKey(key) && typeof raw === "boolean") out[key] = raw;
  }
  return out;
}

export async function readOverrides(db: FlagDb, coupleId: string): Promise<FlagValues> {
  const [row] = await db.select().from(schema.kv).where(eq(schema.kv.key, overrideKey(coupleId)));
  return cleanOverrides(row?.value);
}

export type FlagOverride = {
  coupleId: string;
  key: FlagKey;
  /** true enables, false disables, null returns the couple to the environment's answer. */
  enabled: boolean | null;
  actor: string;
  reason?: string;
};

/**
 * Records an override and appends it to the audit log. This is the only way a
 * flag changes after a deploy, which is what makes the change reviewable.
 */
export async function applyFlagOverride(db: FlagDb, input: FlagOverride): Promise<FlagValues> {
  const before = await readOverrides(db, input.coupleId);
  const next: FlagValues = { ...before };
  if (input.enabled === null) delete next[input.key];
  else next[input.key] = input.enabled;

  await db
    .insert(schema.kv)
    .values({ key: overrideKey(input.coupleId), value: next })
    .onConflictDoUpdate({
      target: schema.kv.key,
      set: { value: next, updatedAt: new Date() },
    });

  await db.insert(schema.auditLog).values({
    actor: input.actor,
    action: "flag.override",
    targetType: "couple",
    targetId: input.coupleId,
    detail: {
      key: input.key,
      reason: input.reason ?? "",
      before: before[input.key] ?? null,
      after: next[input.key] ?? null,
    },
  });
  return next;
}
