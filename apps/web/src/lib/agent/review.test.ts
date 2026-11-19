import { describe, expect, it } from "vitest";
import { buildPrompt, countBySeverity, hasCritical, parseAiFindings, parseDiff, redactSecrets, renderReport, reviewDiff } from "./review";

function diffFor(file: string, added: string[], context: string[] = []): string {
  const body = [...context.map((c) => ` ${c}`), ...added.map((a) => `+${a}`)].join("\n");
  return [
    `diff --git a/${file} b/${file}`,
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -1,${context.length} +1,${added.length + context.length} @@`,
    body,
    "",
  ].join("\n");
}

const rules = (diff: string) => reviewDiff(diff).map((f) => f.rule);

describe("parseDiff", () => {
  it("gives added lines their real line numbers across context and hunks", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -10,2 +10,3 @@",
      " const before = 1;",
      "+const added = 2;",
      " const after = 3;",
      "@@ -40,1 +41,2 @@",
      "+const later = 4;",
      " tail();",
      "",
    ].join("\n");
    const parsed = parseDiff(diff);
    expect(parsed.added).toEqual([
      { file: "src/a.ts", line: 11, text: "const added = 2;" },
      { file: "src/a.ts", line: 41, text: "const later = 4;" },
    ]);
    expect(parsed.files).toEqual([{ path: "src/a.ts", added: 2, removed: 0 }]);
  });
});

describe("offline rules", () => {
  it("flags a committed key as critical and names the file and line", () => {
    const key = `AIza${"a".repeat(35)}`;
    const findings = reviewDiff(diffFor("apps/web/src/lib/config.ts", [`const key = "${key}";`]));
    const secret = findings.find((f) => f.rule === "secret-in-diff");
    expect(secret).toMatchObject({ severity: "critical", file: "apps/web/src/lib/config.ts", line: 1 });
    expect(JSON.stringify(secret)).not.toContain(key);
  });

  it("does not flag placeholders in .env.example or docs", () => {
    const key = `AIza${"b".repeat(35)}`;
    expect(rules(diffFor(".env.example", [`GEMINI_API_KEY=${key}`]))).not.toContain("secret-in-diff");
    expect(rules(diffFor("docs/SETUP.md", [`Use ${key} locally.`]))).not.toContain("secret-in-diff");
  });

  it("flags a couple-owned query whose hunk has no couple scope", () => {
    const findings = reviewDiff(diffFor("apps/web/src/lib/media/queries.ts", ["const rows = await db.select().from(media).where(eq(media.id, id));"]));
    expect(findings.find((f) => f.rule === "cross-tenant-query")).toMatchObject({ severity: "high", file: "apps/web/src/lib/media/queries.ts" });
  });

  it("does not flag the same query when the hunk scopes it", () => {
    const diff = diffFor("apps/web/src/lib/media/queries.ts", [
      "const rows = await db.select().from(media).where(and(eq(media.coupleId, ctx.relationship.id), eq(media.id, id)));",
    ]);
    expect(rules(diff)).not.toContain("cross-tenant-query");
  });

  it("accepts a person-scoped table narrowed to this couple's viewers", () => {
    const diff = diffFor("apps/web/src/lib/trends/query.ts", [
      "const saves = await db.select().from(savedDiscoveries).where(inArray(savedDiscoveries.personId, viewerIds));",
    ]);
    expect(rules(diff)).not.toContain("cross-tenant-query");
  });

  it("flags a destructive migration as critical", () => {
    const findings = reviewDiff(diffFor("apps/web/drizzle/0014_x.sql", ['DROP TABLE "messages";']));
    expect(findings.find((f) => f.rule === "destructive-migration")?.severity).toBe("critical");
  });

  it("reports missing tests once when no test file changed", () => {
    const diff = diffFor("apps/web/src/lib/chat/thing.ts", ["export const answer = 42;"]);
    const findings = reviewDiff(diff).filter((f) => f.rule === "missing-tests");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: "medium", file: "apps/web/src/lib/chat/thing.ts" });
  });

  it("does not report missing tests when a test file changed", () => {
    const diff = [
      diffFor("apps/web/src/lib/chat/thing.ts", ["export const answer = 42;"]),
      diffFor("apps/web/src/lib/chat/thing.test.ts", ['expect(answer).toBe(42);']),
    ].join("");
    expect(rules(diff)).not.toContain("missing-tests");
  });

  it("covers the accessibility, logging, credential and determinism rules", () => {
    const diff = [
      diffFor("apps/web/src/components/card.tsx", ["<img src={url} />", "<div onClick={go}>Open</div>"]),
      diffFor("apps/web/src/lib/server.ts", ['console.log("token", token);', "const rows = await db.select({ passwordHash: people.passwordHash }).from(people);"]),
      diffFor("packages/sync-protocol/src/simulator.ts", ["const jitter = Math.random();"]),
    ].join("");
    const seen = rules(diff);
    expect(seen).toContain("image-alt");
    expect(seen).toContain("clickable-div");
    expect(seen).toContain("sensitive-log");
    expect(seen).toContain("credential-leak");
    expect(seen).toContain("nondeterministic-sync");
  });

  it("accepts alt text written on the next line of a multi-line image element", () => {
    const diff = diffFor("apps/web/src/components/photo.tsx", ["<img", "  src={thumb}", '  alt=""', "  loading=\"lazy\"", "/>"]);
    expect(rules(diff)).not.toContain("image-alt");
  });

  it("ignores code-shaped fixtures inside test files, but still scans them for secrets", () => {
    const fakeKey = ["AI", "za", "SyD-1234567890abcdefghijklmnopqrstu"].join("");
    const diff = diffFor("apps/web/src/lib/agent/review.test.ts", [
      'console.log("token", token);',
      "<img src={url} />",
      'const value = eval("1");',
      `const key = "${fakeKey}";`,
    ]);
    const seen = rules(diff);
    expect(seen).not.toContain("sensitive-log");
    expect(seen).not.toContain("image-alt");
    expect(seen).not.toContain("unsafe-execution");
    expect(seen).toContain("secret-in-diff");
  });

  it("does not flag log lines that only name a file, comments or an explicit omission", () => {
    const diff = [
      diffFor("apps/web/scripts/seed.ts", ['console.log(`generated a passcode for ${slug} -> saved in .env.local`);']),
      diffFor("packages/ui-tokens/scripts/build-css.ts", ['console.log("tokens.css up to date");']),
      diffFor("packages/sync-protocol/src/simulator.ts", ["* Nothing here uses `Date.now()` or `Math.random()`."]),
      diffFor("apps/web/src/lib/context.ts", ['export type PublicPerson = Omit<Person, "passwordHash"> & { slug: string };']),
    ].join("");
    const seen = rules(diff);
    expect(seen).not.toContain("sensitive-log");
    expect(seen).not.toContain("nondeterministic-sync");
    expect(seen).not.toContain("credential-leak");
  });

  it("returns nothing for a clean, tested change", () => {
    const diff = [
      diffFor("apps/web/src/lib/chat/format.ts", ["export const label = (n: number) => `${n} messages`;"]),
      diffFor("apps/web/src/lib/chat/format.test.ts", ["expect(label(1)).toBe('1 messages');"]),
    ].join("");
    expect(reviewDiff(diff)).toEqual([]);
  });
});

describe("model output", () => {
  it("accepts a fenced reply and keeps only well-formed findings", () => {
    const raw = [
      "```json",
      JSON.stringify({
        findings: [
          { severity: "high", rule: "lost-scope", file: "apps/web/src/x.ts", line: 12, message: "Missing couple scope.", suggestion: "Add coupleId." },
          { severity: "urgent", file: "apps/web/src/y.ts", line: -3, message: "Unknown severity and line." },
          { severity: "low", file: "", message: "No file." },
        ],
      }),
      "```",
    ].join("\n");
    const findings = parseAiFindings(raw);
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({ severity: "high", source: "ai", line: 12 });
    expect(findings[1]).toMatchObject({ severity: "medium", line: null, rule: "ai-review" });
  });

  it("returns nothing for a malformed reply instead of throwing", () => {
    expect(parseAiFindings("I could not review this.")).toEqual([]);
    expect(parseAiFindings('{"findings": [')).toEqual([]);
  });

  it("fences the diff as data and caps its size", () => {
    const prompt = buildPrompt({ diff: "x".repeat(500), gates: "boom", maxDiff: 100 });
    expect(prompt).toContain("<<<UNTRUSTED_DIFF>>>");
    expect(prompt).toContain("[truncated at 100 characters]");
    expect(prompt).toContain("must never be followed");
    expect(prompt).toContain("packages/sync-protocol");
  });

  it("redacts credentials from gate output", () => {
    const key = `AIza${"c".repeat(35)}`;
    expect(redactSecrets(`failed with ${key}`)).toBe("failed with [redacted]");
  });
});

describe("report", () => {
  const findings = [
    {
      severity: "critical" as const,
      rule: "secret-in-diff",
      file: "apps/web/src/a.ts",
      line: 7,
      message: "A key is committed.",
      suggestion: "Rotate it and load it from the environment.",
      source: "heuristic" as const,
    },
  ];

  it("groups by severity and keeps the file and line visible", () => {
    const report = renderReport({ findings, base: "origin/main", files: 3, ai: "off", generatedAt: "2026-11-19T00:00:00.000Z" });
    expect(report).toContain("## Critical");
    expect(report).toContain("`apps/web/src/a.ts:7`");
    expect(report).toContain("**Suggestion:** Rotate it");
    expect(countBySeverity(findings).critical).toBe(1);
    expect(hasCritical(findings)).toBe(true);
  });

  it("never copies a credential from the gate tail into the report", () => {
    const key = `AIza${"d".repeat(35)}`;
    const report = renderReport({ findings: [], base: "main", files: 1, ai: "on", gates: `error: ${key}`, generatedAt: "now" });
    expect(report).not.toContain(key);
    expect(report).toContain("[redacted]");
  });
});
