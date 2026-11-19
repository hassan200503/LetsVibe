import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTokensCss } from "../src/css";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "tokens.css");
const expected = renderTokensCss();
const check = process.argv.includes("--check");

if (check) {
  if (!existsSync(target) || readFileSync(target, "utf8") !== expected) {
    console.error("tokens.css is out of date. Run `pnpm --filter @lovora/ui-tokens tokens`.");
    process.exitCode = 1;
  } else {
    console.log("tokens.css up to date");
  }
} else {
  writeFileSync(target, expected);
  console.log("Wrote tokens.css");
}
