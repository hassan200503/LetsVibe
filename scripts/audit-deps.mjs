#!/usr/bin/env node
// Enforces the dependency-audit policy in security/audit-allowlist.json.
//
// The policy (docs/SECURITY.md §Dependency audit):
//
//   1. The audit runs over the scope named in the policy file ("prod"), so a
//      finding only a developer machine can reach is never mixed into the
//      production result and never laundered into a waiver.
//   2. A finding at or above `threshold` fails the build unless an allowlist
//      entry suppresses it. There is no "ignore" switch.
//   3. Every allowlist entry names an advisory, a reason, an owner and an
//      expiry. An expired entry stops suppressing, so a waiver gets re-reviewed
//      instead of becoming permanent.
//
// Exits 0 when the scoped audit is clean or every in-scope finding is waived,
// 1 otherwise. It fails loudly when pnpm's output cannot be parsed, so a change
// in output shape can never be mistaken for "clean".

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const POLICY_PATH = join(root, "security", "audit-allowlist.json");
const SEVERITIES = ["info", "low", "moderate", "high", "critical"];

function fail(message) {
  console.error(`audit-deps: ${message}`);
  process.exit(1);
}

function readPolicy() {
  let policy;
  try {
    // An editor on Windows may prepend a byte-order mark; JSON.parse rejects it.
    const source = readFileSync(POLICY_PATH, "utf8").replace(/^\uFEFF/, "");
    policy = JSON.parse(source);
  } catch (error) {
    fail(`could not read ${POLICY_PATH}: ${error.message}`);
  }

  const { threshold, scope } = policy;
  if (!SEVERITIES.includes(threshold)) {
    fail(`threshold "${threshold}" is not one of ${SEVERITIES.join(", ")}`);
  }
  if (scope !== "prod" && scope !== "all") {
    fail(`scope "${scope}" is not "prod" or "all"`);
  }

  const entries = Array.isArray(policy.entries) ? policy.entries : [];
  for (const entry of entries) {
    for (const field of ["id", "reason", "owner", "expires"]) {
      if (!entry[field]) {
        fail(`allowlist entry ${JSON.stringify(entry.id ?? entry)} is missing "${field}"`);
      }
    }
    if (Number.isNaN(Date.parse(entry.expires))) {
      fail(`allowlist entry ${entry.id} has an unreadable expiry "${entry.expires}"`);
    }
  }

  return { threshold, scope, entries };
}

function runAudit(scope) {
  const command = `pnpm audit --json${scope === "prod" ? " --prod" : ""}`;
  let raw = "";
  try {
    raw = execSync(command, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (error) {
    // pnpm exits non-zero as soon as it has findings; the JSON is still on stdout.
    raw = typeof error.stdout === "string" ? error.stdout : "";
  }

  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    fail(`could not parse the output of \`${command}\`; the audit did not run`);
  }

  const advisories = report.advisories ?? report.vulnerabilities;
  if (!advisories || typeof advisories !== "object" || Array.isArray(advisories)) {
    fail(`\`${command}\` returned no advisories or vulnerabilities map; the audit did not run`);
  }

  return { report, advisories };
}

function ghsaOf(url) {
  return typeof url === "string" ? url.match(/GHSA-[a-z0-9-]+/i)?.[0] ?? null : null;
}

function normalise(advisories) {
  return Object.entries(advisories).map(([key, value]) => {
    const url = value.url ?? value.via?.find((via) => via && typeof via === "object")?.url ?? "";
    const numeric = String(value.id ?? key);
    return {
      id: ghsaOf(url) ?? numeric,
      numeric,
      name: value.module_name ?? value.name ?? key,
      severity: value.severity,
      title: value.title ?? "",
      url: url || (ghsaOf(url) ? `https://github.com/advisories/${ghsaOf(url)}` : ""),
    };
  });
}

// An unrecognised severity sits above every known one, so it always fails
// rather than slipping under the threshold.
function rank(severity) {
  const index = SEVERITIES.indexOf(severity);
  return index === -1 ? SEVERITIES.length : index;
}

function pad(value, width) {
  return String(value).padEnd(width);
}

const { threshold, scope, entries } = readPolicy();
const { report, advisories } = runAudit(scope);
const findings = normalise(advisories);
const floor = rank(threshold);

const inScope = findings.filter((finding) => rank(finding.severity) >= floor);
const belowThreshold = findings.filter((finding) => rank(finding.severity) < floor);

const today = new Date().toISOString().slice(0, 10);
const waived = [];
const active = [];
const usedEntries = new Set();

for (const finding of inScope) {
  const entry = entries.find((candidate) => candidate.id === finding.id || candidate.id === finding.numeric);
  if (!entry) {
    active.push(finding);
    continue;
  }
  usedEntries.add(entry.id);
  if (entry.expires < today) {
    active.push({ ...finding, expired: entry });
    continue;
  }
  waived.push({ ...finding, entry });
}

console.log(`audit-deps  scope=${scope}  threshold=${threshold}`);
console.log(
  `\`pnpm audit${scope === "prod" ? " --prod" : ""}\` reported ${findings.length} advisor${findings.length === 1 ? "y" : "ies"}.`,
);

function printRows(rows) {
  const nameWidth = Math.max(0, ...rows.map((row) => row.name.length));
  const idWidth = Math.max(0, ...rows.map((row) => row.id.length));
  for (const row of rows) {
    console.log(`  ${pad(row.severity.toUpperCase(), 8)} ${pad(row.name, nameWidth)}  ${pad(row.id, idWidth)}  ${row.title}`);
    if (row.url) console.log(`           ${row.url}`);
    if (row.expired) {
      console.log(`           waiver expired on ${row.expired.expires} (owner ${row.expired.owner}); it no longer suppresses`);
    }
  }
}

if (waived.length > 0) {
  console.log("\nWaived by security/audit-allowlist.json:");
  for (const row of waived) {
    console.log(`  ${row.id} (${row.name}) expires ${row.entry.expires}: ${row.entry.reason}`);
  }
}

const unused = entries.filter((entry) => !usedEntries.has(entry.id));
if (unused.length > 0) {
  console.log("\nUnused allowlist entries — remove them so the file stays honest:");
  for (const entry of unused) console.log(`  ${entry.id} (${entry.package ?? "?"})`);
}

if (belowThreshold.length > 0) {
  console.log(`\nBelow the "${threshold}" threshold (reported, does not fail the build):`);
  printRows(belowThreshold);
}

if (active.length > 0) {
  console.log(`\nAt or above "${threshold}" and not waived:`);
  printRows(active);
  fail(`${active.length} advisor${active.length === 1 ? "y" : "ies"} at or above "${threshold}" is not in security/audit-allowlist.json`);
}

const dependencies = report.metadata?.dependencies ?? report.metadata?.totalDependencies ?? "?";
console.log(`\nOK: no ${scope} advisory at or above "${threshold}" among ${dependencies} dependencies.`);
