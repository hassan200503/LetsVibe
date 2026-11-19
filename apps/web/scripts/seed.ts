/**
 * Seeds a generic demo couple so a fresh clone has something to explore.
 * Safe to run repeatedly: existing demo rows are kept.
 *
 * Sign-in details come from SEED_ALEX_EMAIL / SEED_ALEX_PASSWORD (and Sam's).
 * When a password is missing, a random passphrase is generated and appended to
 * .env.local (which git ignores); it is never printed. The same applies to the
 * one-time recovery code.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { passphrase } from "../src/lib/auth/passphrase";
import { hashRecoveryCode, newRecoveryCode } from "../src/lib/auth/recovery";
import { BRAND } from "@lovora/domain";
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db/client";
import { coupleMembers, couples, interests, people, preferences, profiles, projects, radarItems, radarLanes, skills } from "../src/lib/db/schema";

type DemoSlug = "alex" | "sam";
const DEMO_SLUGS = new Set<DemoSlug>(["alex", "sam"]);
const DEMO_EMAILS: Record<DemoSlug, string> = { alex: "alex@example.com", sam: "sam@example.com" };

function ensureEnv(key: string, create: () => string): string {
  const existing = process.env[key]?.trim();
  if (existing) return existing;
  const generated = create();
  const envFile = ".env.local";
  const current = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
  appendFileSync(envFile, `${current && !current.endsWith("\n") ? "\n" : ""}${key}=${generated}\n`);
  process.env[key] = generated;
  console.log(`  generated ${key} -> saved in .env.local`);
  return generated;
}

function credentials(slug: DemoSlug) {
  const prefix = `SEED_${slug.toUpperCase()}`;
  return {
    email: ensureEnv(`${prefix}_EMAIL`, () => DEMO_EMAILS[slug]),
    password: ensureEnv(`${prefix}_PASSWORD`, passphrase),
    recoveryCode: ensureEnv(`${prefix}_RECOVERY`, newRecoveryCode),
  };
}

async function main() {
  const db = await getDb();
  console.log(`Seeding ${BRAND.name}...`);

  const existing = await db.select().from(people);
  if (existing.some((p) => !DEMO_SLUGS.has(p.slug as DemoSlug))) {
    console.log("  existing non-demo people found; leaving this database untouched.");
    return;
  }

  const bySlug = new Map(existing.map((p) => [p.slug, p]));

  async function ensurePerson(values: Omit<typeof people.$inferInsert, "passwordHash" | "email">) {
    const found = bySlug.get(values.slug);
    if (found?.email) return found;
    const secret = credentials(values.slug as DemoSlug);
    const passwordHash = await bcrypt.hash(secret.password, 12);
    const recoveryHash = hashRecoveryCode(secret.recoveryCode);
    if (found) {
      // Upgrades a demo person created before accounts used email sign-in.
      await db.update(people).set({ email: secret.email, passwordHash, recoveryHash }).where(eq(people.id, found.id));
      console.log(`  added sign-in details for ${found.displayName}`);
      return { ...found, email: secret.email };
    }
    const [row] = await db.insert(people).values({ ...values, email: secret.email, passwordHash, recoveryHash }).returning();
    console.log(`  created ${values.displayName}`);
    return row;
  }

  const alex = await ensurePerson({
    slug: "alex",
    displayName: "Alex",
    headline: "Product builder",
    course: "Computer Science",
    focus: "Software & systems",
    intro: "I like small, useful tools and the craft of making complicated things feel simple.",
    motto: "Build small. Learn loudly.",
    theme: "indigo",
    journalTitle: "Learning Journal",
    radarTitle: "Curiosity Radar",
    features: ["projects", "thinking"],
  });

  const sam = await ensurePerson({
    slug: "sam",
    displayName: "Sam",
    headline: "Writer & naturalist",
    course: "Environmental Studies",
    focus: "Nature & culture",
    intro: "I write about the living world, collect field notes, and am slowly learning every bird call nearby.",
    motto: "Notice more.",
    theme: "sage",
    journalTitle: "Field Notes",
    radarTitle: "Nature Radar",
    features: [],
  });

  let [rel] = await db.select().from(couples).limit(1);
  if (!rel) {
    [rel] = await db.insert(couples).values({ name: BRAND.defaultSpaceName }).returning();
    console.log("  created couple");
  }
  await db
    .insert(coupleMembers)
    .values([
      { coupleId: rel.id, personId: alex.id, slug: "alex", slot: 1 },
      { coupleId: rel.id, personId: sam.id, slug: "sam", slot: 2 },
    ])
    .onConflictDoNothing();
  await db
    .insert(profiles)
    .values([
      { personId: alex.id, onboardingCompletedAt: new Date() },
      { personId: sam.id, onboardingCompletedAt: new Date() },
    ])
    .onConflictDoNothing();

  const interestSeed: [string, string[]][] = [
    [alex.id, ["software", "technology", "nature", "philosophy"]],
    [sam.id, ["nature", "birds", "environment", "biotech"]],
  ];
  for (const [personId, topics] of interestSeed) {
    if (!(await db.select().from(interests).where(eq(interests.personId, personId)).limit(1)).length) {
      await db.insert(interests).values(topics.map((topic, position) => ({ personId, topic, position })));
    }
    if (!(await db.select().from(preferences).where(eq(preferences.personId, personId)).limit(1)).length) {
      await db.insert(preferences).values({ personId });
    }
  }

  if (!(await db.select().from(skills).where(eq(skills.personId, alex.id)).limit(1)).length) {
    await db.insert(skills).values([
      { personId: alex.id, name: "TypeScript", category: "Frontend", level: 4, evidence: "Small products, end to end.", primary: true, position: 0, visibility: "shared" },
      { personId: alex.id, name: "PostgreSQL", category: "Data", level: 3, evidence: "Schema design and practical queries.", position: 1, visibility: "shared" },
      { personId: alex.id, name: "Product design", category: "Product", level: 3, evidence: "Turning a fuzzy idea into a usable flow.", position: 2, visibility: "shared" },
    ]);
  }

  if (!(await db.select().from(skills).where(eq(skills.personId, sam.id)).limit(1)).length) {
    await db.insert(skills).values([
      { personId: sam.id, name: "Field writing", category: "Writing", level: 4, evidence: "A growing notebook of observations.", primary: true, position: 0, visibility: "shared" },
      { personId: sam.id, name: "Bird identification", category: "Natural history", level: 3, evidence: "Learning the local callers by ear.", position: 1, visibility: "shared" },
    ]);
  }

  if (!(await db.select().from(projects).where(eq(projects.personId, alex.id)).limit(1)).length) {
    await db.insert(projects).values([
      {
        personId: alex.id,
        name: BRAND.name,
        description: "This website: a private shared world for two, with live discoveries from the real world.",
        problem: "Somewhere to keep a shared story that grows richer the more it is used.",
        stack: ["Next.js", "TypeScript", "PostgreSQL", "Drizzle", "TanStack Query"],
        status: "building",
        startedOn: new Date().toISOString().slice(0, 10),
        visibility: "private",
      },
    ]);
  }

  if (!(await db.select().from(projects).where(eq(projects.personId, sam.id)).limit(1)).length) {
    await db.insert(projects).values([
      {
        personId: sam.id,
        name: "Neighbourhood bird count",
        description: "A weekly walk, a notebook, and a slowly improving map of who lives nearby.",
        stack: ["Notebook", "Binoculars"],
        status: "building",
        startedOn: new Date().toISOString().slice(0, 10),
        visibility: "shared",
      },
    ]);
  }

  const lanes: [string, string[]][] = [
    [alex.id, ["Learning", "Exploring", "Building", "Mastered"]],
    [sam.id, ["Learning", "Exploring", "Practicing", "Interested In"]],
  ];
  for (const [personId, names] of lanes) {
    if ((await db.select().from(radarLanes).where(eq(radarLanes.personId, personId)).limit(1)).length) continue;
    const inserted = await db
      .insert(radarLanes)
      .values(names.map((name, position) => ({ personId, name, position })))
      .returning();
    const lane = (n: string) => inserted.find((l) => l.name === n)!.id;
    await db.insert(radarItems).values(
      personId === alex.id
        ? [
            { personId, laneId: lane("Building"), name: "This website" },
            { personId, laneId: lane("Learning"), name: "Observability", note: "Metrics, alerting and real load." },
          ]
        : [
            { personId, laneId: lane("Practicing"), name: "Bird calls" },
            { personId, laneId: lane("Learning"), name: "Local ecology" },
          ],
    );
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
