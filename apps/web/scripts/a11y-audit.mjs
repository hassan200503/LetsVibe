import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const baseUrl = process.env.BASE_URL ?? "http://localhost:3100";
const colorScheme = process.env.A11Y_SCHEME === "dark" ? "dark" : "light";
const routes = (process.env.A11Y_ROUTES ?? "/,/together/chat,/together,/together/rituals,/gallery,/settings")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

function readPasscode() {
  if (process.env.SEED_ALEX_PASSCODE) return process.env.SEED_ALEX_PASSCODE.trim();
  const envFile = path.resolve(import.meta.dirname, "../.env.local");
  if (!fs.existsSync(envFile)) throw new Error("Set SEED_ALEX_PASSCODE or run pnpm seed to create apps/web/.env.local");
  const match = fs.readFileSync(envFile, "utf8").match(/^SEED_ALEX_PASSCODE=(.+)$/m);
  if (!match) throw new Error("SEED_ALEX_PASSCODE is missing from apps/web/.env.local");
  return match[1].trim();
}

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

const executable = chromeExecutable();
const browser = await chromium.launch({
  executablePath: executable,
  channel: executable ? undefined : "chrome",
  headless: true,
  args: ["--disable-gpu"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme,
    reducedMotion: "reduce",
    locale: "en-US",
  });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/login`, { waitUntil: "load" });
  await page.getByRole("radio").first().click();
  await page.locator("#passcode").fill(readPasscode());
  await page.getByRole("button", { name: /Enter/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });

  const results = {};
  let failures = 0;
  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.evaluate(axeSource);
    const result = await page.evaluate(() =>
      axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
        resultTypes: ["violations"],
      }),
    );
    const violations = result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    }));
    results[route] = violations;
    failures += violations.length;
    console.log(`${route}: ${violations.length} violation${violations.length === 1 ? "" : "s"}`);
    for (const violation of violations) {
      console.log(`  [${violation.impact}] ${violation.id}: ${violation.help}`);
      for (const node of violation.nodes.slice(0, 5)) {
        console.log(`    ${node.target.join(" ")}`);
      }
    }
  }

  const output = process.env.A11Y_OUT ?? path.join(os.tmpdir(), `letsvibe-a11y-${colorScheme}.json`);
  fs.writeFileSync(output, JSON.stringify(results, null, 2));
  console.log(`\nReport: ${output}`);
  if (failures > 0) process.exitCode = 1;
} finally {
  await browser.close();
}
