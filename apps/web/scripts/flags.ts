/**
 * Break-glass flag administration.
 *
 *   FLAGS_ADMIN=1 pnpm --filter @lovora/web flags -- --list
 *   FLAGS_ADMIN=1 pnpm --filter @lovora/web flags -- --couple=<id|exact name> --show
 *   FLAGS_ADMIN=1 pnpm --filter @lovora/web flags -- --couple=<id> --flag=paywall --on --reason="staging trial"
 *   FLAGS_ADMIN=1 pnpm --filter @lovora/web flags -- --couple=<id> --flag=paywall --clear
 *
 * A flag normally comes from FEATURE_FLAGS in the environment and needs a
 * deploy. This tool is for the one couple you want to try something with first:
 * every change goes through applyFlagOverride, which appends the before and
 * after values to the append-only audit log.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db/client";
import { couples } from "../src/lib/db/schema";
import {
  applyFlagOverride,
  explainFlags,
  parseAllowlist,
  parseFlagEnv,
  readOverrides,
} from "../src/lib/flags/core";
import { FLAGS, FLAG_KEYS, isFlagKey, type FlagKey } from "../src/lib/flags/registry";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return found?.slice(prefix.length);
}

const deployment = parseFlagEnv(process.env.FEATURE_FLAGS);
const allowlisted = parseAllowlist(process.env.FEATURE_FLAG_ALLOWLIST);

function printConfig() {
  console.log("Flag                      Default  Environment  Allowlist");
  for (const key of FLAG_KEYS) {
    const env = deployment.value[key] === undefined ? "-" : deployment.value[key] ? "on" : "off";
    const allowed = allowlisted.value[key]?.length ? `${allowlisted.value[key]!.length} couple(s)` : "-";
    console.log(`${key.padEnd(24)}  ${(FLAGS[key].default ? "on" : "off").padEnd(7)}  ${env.padEnd(11)}  ${allowed}`);
  }
  const issues = [...deployment.invalid, ...allowlisted.invalid];
  if (issues.length) {
    console.log("\nCould not read (ignored, flags stay at their default):");
    for (const issue of issues) console.log(`  ${issue}`);
  }
}

async function main() {
  if (process.argv.includes("--list")) {
    printConfig();
    return;
  }
  if (process.env.FLAGS_ADMIN !== "1") {
    throw new Error("Set FLAGS_ADMIN=1 to confirm a deliberate flag change");
  }

  const needle = arg("couple")?.trim();
  if (!needle) throw new Error("Pass --couple=<id or exact couple name>");

  const db = await getDb();
  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(needle);
  const rows = await db
    .select()
    .from(couples)
    .where(isId ? eq(couples.id, needle) : eq(couples.name, needle))
    .limit(2);
  if (rows.length !== 1) throw new Error(rows.length === 0 ? "No exact couple match" : "That name matches more than one couple; use the id");
  const couple = rows[0];

  const overrides = await readOverrides(db, couple.id);
  if (process.argv.includes("--show")) {
    const rowsForCouple = explainFlags({ coupleId: couple.id, env: deployment.value, allowlist: allowlisted.value, overrides });
    console.log(`Couple: ${couple.name} (${couple.id})`);
    console.log("Flag                      On    Source        Default");
    for (const row of rowsForCouple) {
      console.log(`${row.key.padEnd(24)}  ${(row.on ? "on" : "off").padEnd(4)}  ${row.source.padEnd(12)}  ${row.default ? "on" : "off"}`);
    }
    return;
  }

  const flag = arg("flag")?.trim();
  if (!flag) throw new Error("Pass --flag=<name> with --on, --off or --clear");
  if (!isFlagKey(flag)) throw new Error(`Unknown flag "${flag}". Known flags: ${FLAG_KEYS.join(", ")}`);

  const wants = process.argv.includes("--on") ? true : process.argv.includes("--off") ? false : process.argv.includes("--clear") ? null : undefined;
  if (wants === undefined) throw new Error("Pass one of --on, --off or --clear");

  const key: FlagKey = flag;
  const next = await applyFlagOverride(db, {
    coupleId: couple.id,
    key,
    enabled: wants,
    actor: process.env.ENTITLEMENTS_ADMIN_ACTOR?.trim() || "admin:cli",
    reason: arg("reason") ?? "",
  });
  const state = next[key] === undefined ? "environment" : next[key] ? "on" : "off";
  console.log(`${key} for ${couple.name} (${couple.id}): ${state}`);
  console.log("Audit entry written.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Flag update failed");
  process.exit(1);
});
