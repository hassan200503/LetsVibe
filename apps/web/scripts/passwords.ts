/**
 * Issues a fresh password for every account, stores only its bcrypt hash, and
 * writes the email + password pairs to PASSWORDS.local.md (git-ignored) so they
 * can be handed over privately. Nothing is printed.
 *
 *   pnpm passwords                      → local database
 *   DATABASE_URL=… pnpm passwords       → production (Neon)
 *   pnpm passwords --reuse              → re-apply the passwords already in PASSWORDS.local.md
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../src/lib/db/client";
import { people } from "../src/lib/db/schema";
import { passphrase } from "../src/lib/auth/passphrase";

const FILE = "PASSWORDS.local.md";

function readExisting(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(FILE)) return map;
  for (const m of readFileSync(FILE, "utf8").matchAll(/^\| ([^|]+) \| [^|]+ \| `([^`]+)` \|$/gm)) map.set(m[1].trim(), m[2]);
  return map;
}

async function main() {
  const db = await getDb();
  const reuse = process.argv.includes("--reuse");
  const existing = readExisting();
  const everyone = await db.select({ id: people.id, slug: people.slug, name: people.displayName, email: people.email }).from(people);
  const rows: { name: string; email: string; password: string }[] = [];
  for (const p of everyone) {
    const email = (p.email ?? `${p.slug}@example.com`).trim().toLowerCase();
    if (email !== p.email) {
      const [taken] = await db.select({ id: people.id }).from(people).where(sql`lower(${people.email}) = ${email} and ${people.id} <> ${p.id}`).limit(1);
      if (taken) throw new Error(`${p.slug} has no email, and ${email} is already used by another account.`);
      await db.update(people).set({ email }).where(eq(people.id, p.id));
    }
    const password = reuse && existing.get(email) ? existing.get(email)! : passphrase();
    await db.update(people).set({ passwordHash: await bcrypt.hash(password, 12) }).where(eq(people.id, p.id));
    rows.push({ name: p.name, email, password });
  }
  writeFileSync(
    FILE,
    [
      "# Lovora — sign-in details",
      "",
      "Keep this file private. It is git-ignored and never leaves this computer.",
      "Each person signs in with their email and password. Change it any time in Settings → Account.",
      "",
      "| email | name | password |",
      "| --- | --- | --- |",
      ...rows.map((r) => `| ${r.email} | ${r.name} | \`${r.password}\` |`),
      "",
    ].join("\n"),
  );
  console.log(`${reuse ? "Re-applied" : "Issued"} passwords for ${rows.map((r) => r.name).join(" and ")} → ${FILE}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
