import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.env.DATABASE_URL) {
  console.error("Refusing to reset: DATABASE_URL is set. This script only clears the local PGlite world.");
  process.exit(1);
}

await rm(path.join(root, ".data"), { recursive: true, force: true });

const envPath = path.join(root, ".env.local");
try {
  const env = await readFile(envPath, "utf8");
  const kept = env
    .split(/\r?\n/)
    .filter((line) => !/^SEED_[A-Z0-9_]*_PASSCODE=/.test(line.trim()))
    .join("\n")
    .trim();
  if (kept) await writeFile(envPath, `${kept}\n`);
  else await rm(envPath, { force: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

console.log("Local world cleared. Start the app and open /welcome to begin fresh.");
