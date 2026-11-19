import { redactSecrets } from "./review.ts";

export type GateName = "typecheck" | "lint" | "test" | "build" | "a11y" | "unknown";

export type TriageFailure = {
  gate: GateName;
  packageName?: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  message: string;
  hint: string;
  /** A command that reproduces this failure on its own. */
  proof: string;
  rank: number;
  /** The log mentions a file that no longer exists, so the log may be stale. */
  stale: boolean;
};

export type RepairStep = { order: number; title: string; detail: string; command: string };

export type TriageReport = {
  status: "clean" | "failures" | "unknown";
  gate: GateName;
  source: string;
  truncated: boolean;
  failures: TriageFailure[];
  notes: string[];
  steps: RepairStep[];
};

export type TriageInput = {
  log: string;
  source?: string;
  /** Optional label when the caller knows which gate produced the log. */
  gate?: GateName;
  /** Used only to mark stale references; triage never reads or edits source files itself. */
  fileExists?: (file: string) => boolean;
  truncated?: boolean;
};

const ANSI = /\u001b\[[0-9;]*m/g;
const TURBO_PREFIX = /^(@[\w.-]+\/[\w.-]+):[\w:.-]+:\s*/;
const TS_ERROR = /^(.+?\.(?:ts|tsx|mts|cts))\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/;
const ESLINT_ERROR = /^(\S+?\.(?:tsx?|mts|cts|jsx?|mjs|cjs)):(\d+):(\d+)\s+(?:error|warning)\s+(.+)$/;
const ESLINT_RULE = /^(.*?)\s{2,}([@\w/-]+)$/;
const VITEST_FAIL = /^\s*FAIL\s+(\S+?\.(?:test|spec)\.[cm]?[jt]sx?)(?:\s+>\s+(.+))?$/;
const NEXT_LOCATION = /^\s*(?:\.\/)?(\S+?\.(?:tsx?|jsx?|mts|cts)):(\d+):(\d+)\s*$/;
const NEXT_MESSAGE = /^\s*(?:Type error|Error):\s*(.+)$/;
const A11Y_ROUTE = /^\s*(\/[^\s:]*):\s*(\d+)\s+violations?\b/;
const A11Y_RULE = /^\s*\[(?:minor|moderate|serious|critical)\]\s+([\w-]+):\s*(.+)$/;
const TRUNCATED = /\[truncated|truncated at \d+ characters|\.\.\. \(truncated\)|output truncated/i;
const SUCCESS = /Test Files\s+\d+ passed|Tests\s+\d+ passed|Tasks:\s+\d+ successful|Compiled successfully|0 violations\b/i;

function stripLine(line: string): { text: string; packageName?: string } {
  const text = line.replace(ANSI, "");
  const prefixed = text.match(TURBO_PREFIX);
  return prefixed ? { text: text.slice(prefixed[0].length), packageName: prefixed[1] } : { text };
}

function cleanMessage(value: string): string {
  return redactSecrets(value.trim()).slice(0, 400);
}

function relativeFile(file: string | undefined): string | undefined {
  if (!file) return undefined;
  let normal = file.replace(/\\/g, "/").replace(/^\.\//, "");
  // Gates often print absolute paths (`/c/Users/.../apps/web/src/x.ts`): anchor on the workspace part.
  const anchor = /\/(apps\/web|packages\/[^/]+)\//.exec(normal);
  if (anchor) normal = normal.slice(anchor.index + 1);
  return normal.startsWith("apps/web/") ? normal.slice("apps/web/".length) : normal;
}

function focusedTest(file: string | undefined): string | null {
  const normal = relativeFile(file);
  if (!normal) return null;
  if (normal.startsWith("src/")) return `pnpm --filter @lovora/web exec vitest run ${normal}`;
  const pkg = normal.match(/^packages\/([\w-]+)\/(.+)$/);
  if (pkg) return `pnpm --filter @lovora/${pkg[1]} exec vitest run ${pkg[2]}`;
  return null;
}

function proofFor(gate: GateName, failure: { file?: string; packageName?: string }): string {
  const filter = failure.packageName ? `pnpm --filter ${failure.packageName}` : null;
  switch (gate) {
    case "typecheck":
      return filter ? `${filter} typecheck` : "pnpm typecheck";
    case "lint":
      return filter ? `${filter} lint` : "pnpm lint";
    case "test": {
      const focused = focusedTest(failure.file);
      return focused ?? (filter ? `${filter} test` : "pnpm test");
    }
    case "build":
      return filter ? `${filter} build` : "pnpm build";
    case "a11y":
      return "pnpm a11y";
    default:
      return "pnpm typecheck && pnpm lint && pnpm test && pnpm build";
  }
}

function tsHint(code: string): string {
  if (code === "TS2345") return "An argument's type does not match the parameter. Narrow or convert the value at the call site; do not add a cast that hides the mismatch.";
  if (["TS2322", "TS2739", "TS2741"].includes(code)) return "The value does not fit the declared type. Fix the shape at the producer rather than widening the consumer.";
  if (code === "TS2307") return "The module cannot be resolved. Check the import path, the package export and whether typegen has run.";
  if (["TS18048", "TS2532"].includes(code)) return "The value may be undefined. Handle the empty case before using it.";
  if (code === "TS2339") return "The property does not exist on this type. Check the field name and which branch of the union you are in.";
  if (code === "TS2769") return "No overload matches these arguments. Compare the call with the declaration and fix the argument list.";
  return "Read the full diagnostic at this file and line, fix the type at its source, then rerun the focused typecheck.";
}

function lintHint(rule: string | undefined): string {
  switch (rule) {
    case "@typescript-eslint/no-explicit-any":
      return "Replace any with a real domain type; use unknown at untrusted boundaries and narrow it.";
    case "no-unused-vars":
    case "@typescript-eslint/no-unused-vars":
      return "Remove the unused binding, or use it. Do not add an underscore alias just to silence the rule.";
    case "react-hooks/exhaustive-deps":
      return "Add the missing dependency or move the value inside the effect. Do not disable the rule to get green.";
    case "react-hooks/rules-of-hooks":
      return "Call hooks unconditionally at the top level of the component or hook.";
    case "@next/next/no-img-element":
      return "Use next/image, or keep the img with explicit dimensions and alt text where next/image cannot be used.";
    default:
      return "Fix the rule violation at this location; a disable comment is not a repair.";
  }
}

function addFailure(out: TriageFailure[], failure: Omit<TriageFailure, "rank" | "stale" | "hint" | "proof"> & { hint?: string; proof?: string }, input: TriageInput): void {
  const gate = failure.gate;
  const file = relativeFile(failure.file);
  const route = file?.startsWith("/");
  const stale = Boolean(file && !route && input.fileExists && !input.fileExists(file));
  out.push({
    ...failure,
    file,
    message: cleanMessage(failure.message),
    hint: failure.hint ?? (gate === "test" ? "Run the focused test, read the assertion, and decide whether the test or the implementation is wrong. Never delete an assertion to pass the gate." : gate === "a11y" ? "Fix the page markup for this axe rule, then rerun the audit in light and dark." : "Fix the failure at this location and rerun the focused gate."),
    proof: failure.proof ?? proofFor(gate, { file, packageName: failure.packageName }),
    rank: gate === "typecheck" || gate === "build" ? 1 : gate === "lint" ? 2 : gate === "test" ? 3 : gate === "a11y" ? 4 : 5,
    stale,
  });
}

/** Parses a saved gate log. It never runs a command and never invents a failure. */
export function triageLog(input: TriageInput): TriageReport {
  const log = input.log.replace(/\r\n/g, "\n");
  const lines = log.split("\n");
  const failures: TriageFailure[] = [];
  const notes: string[] = [];
  const truncated = Boolean(input.truncated) || TRUNCATED.test(log);
  let currentPackage: string | undefined;
  let a11yRoute: { route: string; count: number } | null = null;
  let buildMarker = false;

  const push = (failure: Omit<TriageFailure, "rank" | "stale" | "hint" | "proof"> & { hint?: string; proof?: string }) => {
    addFailure(failures, { packageName: currentPackage, ...failure }, input);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const { text, packageName } = stripLine(lines[index]);
    if (packageName) currentPackage = packageName;
    if (/Failed to compile\.?$/i.test(text.trim())) buildMarker = true;

    const ts = text.match(TS_ERROR);
    if (ts) {
      push({ gate: "typecheck", file: ts[1], line: Number(ts[2]), column: Number(ts[3]), rule: ts[4], message: ts[5], hint: tsHint(ts[4]) });
      continue;
    }

    const lint = text.match(ESLINT_ERROR);
    if (lint) {
      const body = lint[4];
      const ruleMatch = body.match(ESLINT_RULE);
      const rule = ruleMatch?.[2];
      const message = ruleMatch?.[1] ?? body;
      push({ gate: "lint", file: lint[1], line: Number(lint[2]), column: Number(lint[3]), rule, message, hint: lintHint(rule) });
      continue;
    }

    const test = text.match(VITEST_FAIL);
    if (test) {
      let message = test[2] ?? "Failing test file";
      for (let ahead = index + 1; ahead < Math.min(index + 8, lines.length); ahead += 1) {
        const detail = stripLine(lines[ahead]).text.match(/^\s*(?:AssertionError|Error):\s+(.+)$/);
        if (detail) {
          message = `${message} — ${detail[1]}`;
          break;
        }
      }
      push({ gate: "test", file: test[1], rule: "assertion", message });
      continue;
    }

    const nextLocation = text.match(NEXT_LOCATION);
    if (nextLocation) {
      let message = "";
      for (let ahead = index + 1; ahead < Math.min(index + 4, lines.length); ahead += 1) {
        const detail = stripLine(lines[ahead]).text.match(NEXT_MESSAGE);
        if (detail) {
          message = detail[1];
          break;
        }
      }
      if (message) {
        push({ gate: "build", file: nextLocation[1], line: Number(nextLocation[2]), column: Number(nextLocation[3]), rule: "type-error", message });
        continue;
      }
    }

    const route = text.match(A11Y_ROUTE);
    if (route) {
      const count = Number(route[2]);
      a11yRoute = count > 0 ? { route: route[1], count } : null;
      continue;
    }
    const rule = text.match(A11Y_RULE);
    if (rule && a11yRoute) {
      push({ gate: "a11y", file: a11yRoute.route, rule: rule[1], message: rule[2] });
      a11yRoute.count -= 1;
      if (a11yRoute.count <= 0) a11yRoute = null;
      continue;
    }
  }

  if (a11yRoute && a11yRoute.count > 0) {
    push({ gate: "a11y", file: a11yRoute.route, rule: "axe", message: `${a11yRoute.count} accessibility violation${a11yRoute.count === 1 ? "" : "s"} on this route; the log is truncated before the rule names.` });
  }

  if (buildMarker && !failures.some((failure) => failure.gate === "build")) {
    push({ gate: "build", rule: "compile", message: "The build failed to compile, but no file location survived in the log." });
  }

  const deduped: TriageFailure[] = [];
  const seen = new Set<string>();
  for (const failure of failures) {
    const id = `${failure.gate}|${failure.file ?? ""}|${failure.line ?? ""}|${failure.rule ?? ""}|${failure.message}`;
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(failure);
  }
  deduped.sort((a, b) => a.rank - b.rank || (a.file ?? "").localeCompare(b.file ?? "") || (a.line ?? 0) - (b.line ?? 0));

  if (deduped.some((failure) => failure.stale)) {
    const stale = [...new Set(deduped.filter((failure) => failure.stale).map((failure) => failure.file))];
    notes.push(`The log mentions ${stale.join(", ")}, which no longer exist${stale.length === 1 ? "s" : ""}. Re-run the gate before editing; the log is probably stale.`);
  }
  if (truncated) {
    notes.push(deduped.length ? "The log is truncated, so more failures may follow. Re-run the gate and triage the new log after fixing these." : "The log is truncated and contains no recognised failure. Re-run the gate with --run <gate> to capture fresh output.");
  }
  if (deduped.length === 0 && !truncated && /Test Files\s+\d+ failed|Tests\s+\d+ failed/.test(log)) {
    notes.push("The summary says a test failed, but no FAIL line survived. Re-run the focused test file to locate it.");
  }

  const status: TriageReport["status"] = deduped.length ? "failures" : !log.trim() || truncated || !SUCCESS.test(log) ? "unknown" : "clean";
  if (status === "unknown" && deduped.length === 0 && !truncated && !notes.some((note) => note.includes("--run"))) {
    notes.push("No recognised failure marker in this log. Pass --run <typecheck|lint|test|build|a11y> to capture fresh output, or --log with a complete gate log.");
  }

  const steps: RepairStep[] = deduped.map((failure, index) => ({
    order: index + 1,
    title: `${failure.file ?? failure.packageName ?? "failure"}${failure.line ? `:${failure.line}${failure.column ? `:${failure.column}` : ""}` : ""}${failure.rule ? ` · ${failure.rule}` : ""}`,
    detail: failure.hint,
    command: failure.proof,
  }));
  if (steps.length) {
    steps.push({
      order: steps.length + 1,
      title: "Confirm the full gate set",
      detail: "After the focused fix passes, run every gate before committing. Add pnpm a11y for UI changes.",
      command: "pnpm typecheck && pnpm lint && pnpm test && pnpm build",
    });
  }

  return {
    status,
    gate: input.gate ?? deduped[0]?.gate ?? "unknown",
    source: input.source ?? "gate log",
    truncated,
    failures: deduped,
    notes,
    steps,
  };
}

export function renderTriage(report: TriageReport, generatedAt = new Date().toISOString()): string {
  const header = [`# Gate triage — ${generatedAt}`, "", `Source: \`${report.source}\` · gate: ${report.gate} · status: **${report.status}**`, ""];
  if (report.status === "failures") {
    const packages = [...new Set(report.failures.map((failure) => failure.packageName).filter(Boolean))];
    header.push(`**${report.failures.length} failure${report.failures.length === 1 ? "" : "s"}**${packages.length ? ` in ${packages.join(", ")}` : ""}. The plan below is ordered so a compile error is fixed before style and test failures.`, "");
  } else if (report.status === "clean") {
    header.push("No recognised failures. Nothing to repair from this log.", "");
  } else {
    header.push("**No diagnosis.** The log does not contain a failure this tool recognises, so no repair is suggested.", "");
  }

  const diagnosis = report.failures.length
    ? [
        "## Diagnosis",
        "",
        ...report.failures.map((failure) => {
          const location = `${failure.file ?? failure.packageName ?? "unknown"}${failure.line ? `:${failure.line}${failure.column ? `:${failure.column}` : ""}` : ""}`;
          return `- \`${location}\` · ${failure.rule ?? failure.gate}${failure.stale ? " · **stale reference**" : ""} — ${failure.message}`;
        }),
        "",
      ]
    : [];

  const plan = report.steps.length
    ? [
        "## Repair plan",
        "",
        ...report.steps.flatMap((step) => [`${step.order}. **${step.title}** — ${step.detail}`, `   Prove: \`${step.command}\``]),
        "",
      ]
    : [];

  const notes = report.notes.length ? ["## Notes", "", ...report.notes.map((note) => `- ${note}`), ""] : [];

  return [...header, ...diagnosis, ...plan, ...notes, "_Produced by `pnpm triage:agent`. It is advisory: it never edits, stages, commits or pushes._", ""].join("\n");
}
