#!/usr/bin/env node
/**
 * Turn a failing gate log into a ranked repair plan.
 *
 *   pnpm triage:agent                          # newest .loop/logs/*.log
 *   pnpm triage:agent -- --log .loop/logs/iter-0004.log
 *   pnpm triage:agent -- --run typecheck       # run one fixed, read-only gate
 *   pnpm triage:agent -- --run test --out .loop/triage/test-plan.md
 *
 * Advisory by design: it reads or runs a gate, writes a report under .loop/,
 * and never edits, stages, commits, pushes or deletes anything. Exit code is 0
 * when a report is produced (even if the gate failed), and 2 on a usage error.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderTriage, triageLog, type GateName } from "../apps/web/src/lib/agent/triage.ts";

type RunnableGate = Exclude<GateName, "unknown">;

const GATES: Record<RunnableGate, string> = {
  typecheck: "typecheck",
  lint: "lint",
  test: "test",
  build: "build",
  a11y: "a11y",
};

const args = process.argv.slice(2);
const flag = (name: string): string | null => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
};

function newestLog(cwd: string): { text: string; source: string; truncated: boolean } | null {
  const explicit = flag("--log");
  if (explicit) {
    const full = path.resolve(cwd, explicit);
    try {
      const text = readFileSync(full, "utf8");
      return { text: text.length > 120_000 ? text.slice(-120_000) : text, source: explicit, truncated: text.length > 120_000 };
    } catch {
      process.stderr.write(`Cannot read ${explicit}. Point --log at a saved gate log.\n`);
      return null;
    }
  }
  const dir = path.join(cwd, ".loop", "logs");
  try {
    const newest = readdirSync(dir)
      .filter((name) => name.endsWith(".log"))
      .map((name) => ({ name, at: statSync(path.join(dir, name)).mtimeMs }))
      .sort((a, b) => b.at - a.at)[0];
    if (newest) {
      const text = readFileSync(path.join(dir, newest.name), "utf8");
      return { text: text.length > 120_000 ? text.slice(-120_000) : text, source: `.loop/logs/${newest.name}`, truncated: text.length > 120_000 };
    }
  } catch {
    /* no saved logs */
  }
  return null;
}

function runGate(cwd: string, gate: RunnableGate): { text: string; source: string; truncated: boolean } {
  process.stderr.write(`Running pnpm ${GATES[gate]}…\n`);
  const command = `pnpm ${GATES[gate]}`;
  const result = spawnSync(command, {
    cwd,
    encoding: "utf8",
    shell: true,
    timeout: 20 * 60_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return { text, source: `pnpm ${GATES[gate]} (live, exit ${result.status ?? "timeout"})`, truncated: result.status === null };
}

function main() {
  const cwd = process.cwd();
  const requested = flag("--run");
  let gate: RunnableGate | undefined;
  if (requested) {
    if (!(requested in GATES)) {
      process.stderr.write(`Unknown gate "${requested}". Use one of: ${Object.keys(GATES).join(", ")}.\n`);
      process.exitCode = 2;
      return;
    }
    gate = requested as RunnableGate;
  }

  const captured = gate ? runGate(cwd, gate) : newestLog(cwd);
  if (!captured) {
    process.stderr.write("No gate log found. Pass --log <file> or --run <typecheck|lint|test|build|a11y>.\n");
    process.exitCode = 2;
    return;
  }

  const roots = [cwd, path.join(cwd, "apps", "web"), ...["domain", "sync-protocol", "ui-tokens", "config"].map((name) => path.join(cwd, "packages", name))];
  const fileExists = (file: string) => existsSync(file) || roots.some((root) => existsSync(path.join(root, file)));

  const report = triageLog({ log: captured.text, source: captured.source, gate, fileExists, truncated: captured.truncated });
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(cwd, ".loop", "triage");
  const outFile = flag("--out") ? path.resolve(cwd, flag("--out") as string) : path.join(outDir, `triage-${stamp}.md`);
  if (!outFile.startsWith(path.join(cwd, ".loop") + path.sep)) {
    process.stderr.write("Refusing to write outside .loop/. Use --out with a path under .loop/.\n");
    process.exitCode = 2;
    return;
  }
  mkdirSync(path.dirname(outFile), { recursive: true });
  const markdown = renderTriage(report, now.toISOString());
  writeFileSync(outFile, markdown);
  writeFileSync(path.join(outDir, "latest.md"), markdown);

  process.stdout.write(`\nGate triage · ${report.source}\n`);
  process.stdout.write(`status: ${report.status} · gate: ${report.gate} · ${report.failures.length} failure${report.failures.length === 1 ? "" : "s"}${report.truncated ? " · log truncated" : ""}\n`);
  for (const failure of report.failures.slice(0, 6)) {
    process.stdout.write(`  ${failure.file ?? failure.packageName ?? "?"}${failure.line ? `:${failure.line}` : ""} · ${failure.rule ?? failure.gate}\n`);
  }
  for (const note of report.notes) process.stdout.write(`  note: ${note}\n`);
  process.stdout.write(`Plan: ${path.relative(cwd, outFile)}\n`);
  process.exitCode = 0;
}

main();
