import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

/**
 * Motion and forced-colours audit for the core screens.
 *
 * 1. `prefers-reduced-motion: reduce` must remove CSS animations, long
 *    transitions and smooth scrolling.
 * 2. No infinite animation may cycle faster than 333 ms (WCAG 2.3.1 flash
 *    threshold) while motion is allowed.
 * 3. `forced-colors: active` must keep gradient text, borders and keyboard
 *    focus visible; axe runs with colour-contrast off because the OS owns
 *    the palette there.
 *
 * Canvas, video and third-party iframes are out of scope; document any change
 * that adds them.
 */
const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const baseUrl = process.env.BASE_URL ?? "http://localhost:3100";
const routes = (process.env.MOTION_ROUTES ?? "/,/research,/together/chat,/together,/gallery,/settings")
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
  return [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]
    .filter(Boolean)
    .find((candidate) => fs.existsSync(candidate));
}

async function signIn(page, passcode) {
  await page.getByRole("radio").first().click();
  await page.locator("#passcode").fill(passcode);
  await page.getByRole("button", { name: /Enter/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 120000 });
}

/** Runs in the page: durations in seconds, rendered elements only, readable selector. */
function reducedMotionFindings() {
  const seconds = (value) =>
    value
      .split(",")
      .map((part) => part.trim())
      .map((part) => (part.endsWith("ms") ? parseFloat(part) / 1000 : part.endsWith("s") ? parseFloat(part) : 0))
      .filter((n) => Number.isFinite(n));
  const selectorOf = (el) => {
    const classes = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${classes.length ? `.${classes.join(".")}` : ""}`;
  };
  const findings = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!el.getClientRects().length) continue;
    const style = getComputedStyle(el);
    const names = style.animationName.split(",").map((n) => n.trim());
    if (names.some((name) => name && name !== "none")) {
      const longest = Math.max(0, ...seconds(style.animationDuration));
      if (longest > 0.02) findings.push({ rule: "animation", selector: selectorOf(el), seconds: longest, names });
    }
    if (style.transitionProperty !== "none") {
      const longest = Math.max(0, ...seconds(style.transitionDuration));
      if (longest > 0.02) findings.push({ rule: "transition", selector: selectorOf(el), seconds: longest });
    }
  }
  for (const el of [document.documentElement, document.body]) {
    if (getComputedStyle(el).scrollBehavior !== "auto") findings.push({ rule: "smooth-scroll", selector: el.tagName.toLowerCase() });
  }
  return findings;
}

function flashingFindings() {
  const findings = [];
  for (const animation of document.getAnimations()) {
    const timing = animation.effect?.getTiming?.();
    const duration = typeof timing?.duration === "number" ? timing.duration : 0;
    if (timing?.iterations === Infinity && duration > 0 && duration < 333) {
      findings.push({ animation: animation.animationName ?? animation.constructor.name, durationMs: Math.round(duration), playState: animation.playState });
    }
  }
  return findings;
}

function gradientTextFindings() {
  const alpha = (color) => {
    if (!color || color === "transparent") return 0;
    const match = color.match(/rgba?\(([^)]+)\)/);
    if (!match) return 1;
    const parts = match[1].split(/[,\s/]+/).filter(Boolean);
    return parts.length >= 4 ? parseFloat(parts[3]) : 1;
  };
  const findings = [];
  for (const el of document.querySelectorAll(".gold-shimmer, .gold-deep")) {
    if (!el.getClientRects().length) continue;
    const style = getComputedStyle(el);
    const clip = `${style.backgroundClip} ${style.webkitBackgroundClip ?? ""}`;
    if (clip.includes("text") && alpha(style.color) < 0.5) {
      findings.push({ selector: el.className, color: style.color, clip: clip.trim() });
    }
  }
  return findings;
}

const executable = chromeExecutable();
const browser = await chromium.launch({
  executablePath: executable,
  channel: executable ? undefined : "chrome",
  headless: true,
  args: ["--disable-gpu"],
});

const results = { reducedMotion: {}, flashing: {}, forcedColors: {}, axeForced: {}, focusForced: {} };
let failures = 0;

try {
  // ── Reduced motion + flash threshold ────────────────────────────────────
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: "light",
      reducedMotion: "reduce",
      locale: "en-US",
    });
    const page = await context.newPage();
    const passcode = readPasscode();
    await page.goto(`${baseUrl}/login`, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(800);
    for (const route of ["/login", ...routes]) {
      if (route === "/login") {
        results.reducedMotion[route] = await page.evaluate(reducedMotionFindings);
      } else {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "load", timeout: 120000 });
        await page.waitForTimeout(800);
        results.reducedMotion[route] = await page.evaluate(reducedMotionFindings);
      }
      failures += results.reducedMotion[route].length;
      console.log(`${route}: ${results.reducedMotion[route].length} reduced-motion finding${results.reducedMotion[route].length === 1 ? "" : "s"}`);
      for (const finding of results.reducedMotion[route].slice(0, 5)) console.log(`  ${finding.rule} ${finding.selector} ${finding.seconds ?? ""}`);
    }
    await signIn(page, passcode).catch(async (error) => {
      console.log(`sign-in after reduced-motion login audit failed: ${error.message}`);
    });
    await context.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: "light",
      reducedMotion: "no-preference",
      locale: "en-US",
    });
    const page = await context.newPage();
    const passcode = readPasscode();
    await page.goto(`${baseUrl}/login`, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(800);
    results.flashing["/login"] = await page.evaluate(flashingFindings);
    failures += results.flashing["/login"].length;
    console.log(`/login: ${results.flashing["/login"].length} fast flash source${results.flashing["/login"].length === 1 ? "" : "s"}`);
    for (const finding of results.flashing["/login"].slice(0, 5)) console.log(`  ${finding.animation} ${finding.durationMs}ms`);

    await signIn(page, passcode);
    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "load", timeout: 120000 });
      await page.waitForTimeout(800);
      results.flashing[route] = await page.evaluate(flashingFindings);
      failures += results.flashing[route].length;
      console.log(`${route}: ${results.flashing[route].length} fast flash source${results.flashing[route].length === 1 ? "" : "s"}`);
      for (const finding of results.flashing[route].slice(0, 5)) console.log(`  ${finding.animation} ${finding.durationMs}ms`);
    }
    await context.close();
  }

  // ── Forced colours: axe with OS-owned contrast, gradient text, focus ─────
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: "light",
      forcedColors: "active",
      reducedMotion: "reduce",
      locale: "en-US",
    });
    const page = await context.newPage();
    const passcode = readPasscode();
    await page.goto(`${baseUrl}/login`, { waitUntil: "load", timeout: 120000 });

    const runForcedRoute = async (route) => {
      await page.waitForTimeout(600);
      results.forcedColors[route] = await page.evaluate(gradientTextFindings);
      failures += results.forcedColors[route].length;

      await page.evaluate(axeSource);
      const axe = await page.evaluate(() =>
        axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
          resultTypes: ["violations"],
          rules: { "color-contrast": { enabled: false } },
        }),
      );
      results.axeForced[route] = axe.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
      }));
      failures += axe.violations.length;

      const focus = [];
      const seen = new Set();
      for (let i = 0; i < 12 && seen.size < 3; i++) {
        await page.keyboard.press("Tab");
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            text: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
            outlineStyle: style.outlineStyle,
            outlineWidth: parseFloat(style.outlineWidth),
            visible: box.width > 0 && box.height > 0,
          };
        });
        if (!stop || !stop.visible) continue;
        const key = `${stop.tag}:${stop.text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (stop.outlineStyle === "none" || !(stop.outlineWidth >= 1)) focus.push({ ...stop, rule: "focus-outline" });
      }
      results.focusForced[route] = focus;
      failures += focus.length;

      console.log(`${route}: ${results.forcedColors[route].length} invisible gradient text, ${axe.violations.length} axe, ${focus.length} focus findings`);
    };

    await runForcedRoute("/login");
    await signIn(page, passcode);
    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "load", timeout: 120000 });
      await runForcedRoute(route);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const output = process.env.MOTION_OUT ?? path.join(os.tmpdir(), "letsvibe-motion.json");
fs.writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} finding${failures === 1 ? "" : "s"}`);
console.log(`Report: ${output}`);
process.exitCode = failures === 0 ? 0 : 1;
