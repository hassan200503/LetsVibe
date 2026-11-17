/**
 * Break-glass plan administration.
 *
 *   ENTITLEMENTS_ADMIN=1 pnpm --filter @letsvibe/web entitlements -- --couple=<id|exact name> --show
 *   ENTITLEMENTS_ADMIN=1 pnpm --filter @letsvibe/web entitlements -- --couple=<id|exact name> --plan=premium --reason="Support ticket 123"
 *
 * Every change goes through applyEntitlementOverride, which appends the before
 * and after values to the append-only audit log. No secret or user content is
 * printed.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db/client";
import { couples } from "../src/lib/db/schema";
import { applyEntitlementOverride, PLAN_LABEL, limitsOf, usageSummary } from "../src/lib/entitlements/core";
import { formatBytes, resetLabel } from "../src/lib/entitlements/format";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return found?.slice(prefix.length);
}

function numberArg(name: string): number | undefined {
  const raw = arg(name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`--${name} must be a number`);
  return value;
}

async function main() {
  if (process.env.ENTITLEMENTS_ADMIN !== "1") {
    throw new Error("Set ENTITLEMENTS_ADMIN=1 to confirm a deliberate plan change");
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

  if (process.argv.includes("--show")) {
    const summary = await usageSummary(db, couple.id);
    console.log(`Couple: ${couple.name} (${couple.id})`);
    console.log(`Plan: ${PLAN_LABEL[summary.plan]}`);
    console.log(`Storage: ${formatBytes(summary.usage.storageBytes)} of ${formatBytes(summary.limits.storageBytes)}`);
    console.log(`AI questions: ${summary.usage.aiQuestions} of ${summary.limits.aiQuestionsPerMonth} · resets ${resetLabel(summary.resetsAt)}`);
    console.log(`Rooms: ${summary.usage.rooms} of ${summary.limits.rooms}`);
    console.log(`Exports: ${summary.usage.exports} of ${summary.limits.exportsPerMonth}`);
    return;
  }

  const storageGb = numberArg("storage-gb");
  const after = await applyEntitlementOverride(db, {
    coupleId: couple.id,
    actor: process.env.ENTITLEMENTS_ADMIN_ACTOR?.trim() || "admin:cli",
    reason: arg("reason") ?? "",
    plan: arg("plan") as "free" | "premium" | undefined,
    storageBytes: storageGb === undefined ? undefined : Math.round(storageGb * 1024 * 1024 * 1024),
    aiQuestionsPerMonth: numberArg("ai"),
    rooms: numberArg("rooms"),
    exportsPerMonth: numberArg("exports"),
  });
  const limits = limitsOf(after);
  console.log(`Updated ${couple.name} (${couple.id}) to ${PLAN_LABEL[after.plan]}`);
  console.log(`Storage: ${formatBytes(limits.storageBytes)} · AI: ${limits.aiQuestionsPerMonth}/month · Rooms: ${limits.rooms} · Exports: ${limits.exportsPerMonth}/month`);
  console.log("Audit entry written.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Plan update failed");
  process.exit(1);
});
