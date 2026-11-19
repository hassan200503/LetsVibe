import { describe, expect, it } from "vitest";
import { renderTriage, triageLog, type TriageInput } from "./triage";

const run = (log: string, extra: Partial<TriageInput> = {}) => triageLog({ log, source: "fixture.log", ...extra });

describe("gate triage", () => {
  it("locates a typecheck error through the turbo prefix and names the package, file, line and code", () => {
    const report = run("@lovora/web:typecheck: src/lib/foo.ts(12,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.");
    expect(report.status).toBe("failures");
    expect(report.gate).toBe("typecheck");
    const failure = report.failures[0];
    expect(failure).toMatchObject({ gate: "typecheck", packageName: "@lovora/web", file: "src/lib/foo.ts", line: 12, column: 5, rule: "TS2345", rank: 1, stale: false });
    expect(failure.hint).toMatch(/argument/i);
    expect(failure.proof).toBe("pnpm --filter @lovora/web typecheck");
  });

  it("normalizes absolute paths to the workspace and still flags them as stale when missing", () => {
    const report = run("@lovora/web:lint: /c/Users/dev/repo/apps/web/src/app/page.tsx:9:7  error  Unexpected any  @typescript-eslint/no-explicit-any", { fileExists: () => false });
    expect(report.failures[0]).toMatchObject({ file: "src/app/page.tsx", line: 9, stale: true });
    expect(report.notes.join("\n")).toContain("src/app/page.tsx");
  });

  it("splits an ESLint message from its rule and gives a focused proof command", () => {
    const report = run("@lovora/web:lint: src/app/page.tsx:9:7  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any");
    const failure = report.failures[0];
    expect(failure).toMatchObject({ gate: "lint", file: "src/app/page.tsx", line: 9, column: 7, rule: "@typescript-eslint/no-explicit-any", rank: 2 });
    expect(failure.message).toBe("Unexpected any. Specify a different type");
    expect(failure.hint).toMatch(/any/i);
    expect(failure.proof).toBe("pnpm --filter @lovora/web lint");
  });

  it("reads a Vitest FAIL line and its assertion, and proves it with the focused file", () => {
    const report = run(
      [
        "@lovora/web:test:  FAIL  src/lib/chat.test.ts > send > retries after a lost reply",
        "@lovora/web:test: AssertionError: expected 2 to be 3",
      ].join("\n"),
    );
    const failure = report.failures[0];
    expect(failure).toMatchObject({ gate: "test", file: "src/lib/chat.test.ts", rule: "assertion", rank: 3 });
    expect(failure.message).toContain("retries after a lost reply");
    expect(failure.message).toContain("expected 2 to be 3");
    expect(failure.proof).toBe("pnpm --filter @lovora/web exec vitest run src/lib/chat.test.ts");
  });

  it("reads a Next build type error without duplicating it as a generic compile failure", () => {
    const report = run(
      [
        "@lovora/web:build: Failed to compile.",
        "@lovora/web:build: ./src/app/page.tsx:14:9",
        "@lovora/web:build: Type error: Type 'string' is not assignable to type 'number'.",
      ].join("\n"),
    );
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]).toMatchObject({ gate: "build", file: "src/app/page.tsx", line: 14, column: 9, rule: "type-error", rank: 1 });
    expect(report.failures[0].proof).toBe("pnpm --filter @lovora/web build");
  });

  it("turns axe output into one failure per rule and never treats a route as a missing file", () => {
    const report = run(
      [
        "/settings: 2 violations",
        "  [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds",
        "  [critical] label: Form elements must have labels",
      ].join("\n"),
      { fileExists: () => false },
    );
    expect(report.failures.map((failure) => failure.rule)).toEqual(["color-contrast", "label"]);
    expect(report.failures.every((failure) => failure.gate === "a11y" && failure.file === "/settings" && !failure.stale)).toBe(true);
    expect(report.failures[0].proof).toBe("pnpm a11y");
  });

  it("reports a clean log as clean and suggests no repair", () => {
    const report = run(["@lovora/web:test:  Test Files  25 passed (25)", "@lovora/web:test:       Tests  273 passed (273)"].join("\n"));
    expect(report.status).toBe("clean");
    expect(report.failures).toEqual([]);
    expect(report.steps).toEqual([]);
  });

  it("refuses to invent a diagnosis from a truncated log", () => {
    const report = run("@lovora/web:test: [truncated at 120000 characters]");
    expect(report.status).toBe("unknown");
    expect(report.failures).toEqual([]);
    expect(report.truncated).toBe(true);
    expect(report.notes.join(" ")).toMatch(/truncated/i);
    expect(report.notes.join(" ")).toMatch(/--run/);
    expect(report.steps).toEqual([]);
  });

  it("marks a known failure in a truncated log and warns that more may follow", () => {
    const report = run("@lovora/web:typecheck: src/lib/a.ts(1,2): error TS2307: Cannot find module './b'.", { truncated: true });
    expect(report.status).toBe("failures");
    expect(report.truncated).toBe(true);
    expect(report.notes.join(" ")).toMatch(/more failures may follow/i);
    expect(report.steps.at(-1)?.command).toContain("pnpm typecheck");
  });

  it("marks a stale file reference instead of pretending the log is current", () => {
    const report = run("@lovora/web:typecheck: src/lib/gone.ts(4,1): error TS2307: Cannot find module './x'.", { fileExists: () => false });
    expect(report.failures[0].stale).toBe(true);
    expect(report.notes.join(" ")).toMatch(/no longer exists/i);
    expect(report.steps[0].detail).toMatch(/module/i);
  });

  it("orders typecheck before lint before tests and ends with the full gate set", () => {
    const report = run(
      [
        "@lovora/web:test:  FAIL  src/lib/a.test.ts > one",
        "@lovora/web:lint: src/app/a.tsx:1:1  error  bad thing  some-rule",
        "@lovora/web:typecheck: src/lib/a.ts(2,3): error TS2322: nope",
      ].join("\n"),
    );
    expect(report.failures.map((failure) => failure.gate)).toEqual(["typecheck", "lint", "test"]);
    expect(report.steps.map((step) => step.order)).toEqual([1, 2, 3, 4]);
    expect(report.steps.at(-1)).toMatchObject({ title: "Confirm the full gate set", command: "pnpm typecheck && pnpm lint && pnpm test && pnpm build" });
  });

  it("says so when the summary failed but no FAIL line survived", () => {
    const report = run("Test Files  1 failed | 24 passed (25)");
    expect(report.status).toBe("unknown");
    expect(report.failures).toEqual([]);
    expect(report.notes.join(" ")).toMatch(/summary says a test failed/i);
  });

  it("handles an empty log without a diagnosis", () => {
    const report = run("");
    expect(report.status).toBe("unknown");
    expect(report.failures).toEqual([]);
    expect(report.notes.join(" ")).toMatch(/--run/);
  });

  it("renders a readable, evidence-linked plan", () => {
    const report = run("@lovora/web:typecheck: src/lib/foo.ts(12,5): error TS2345: bad argument");
    const markdown = renderTriage(report, "2026-11-19T00:00:00.000Z");
    expect(markdown).toContain("`src/lib/foo.ts:12:5`");
    expect(markdown).toContain("TS2345");
    expect(markdown).toContain("pnpm --filter @lovora/web typecheck");
    expect(markdown).toContain("never edits, stages, commits or pushes");
  });
});
