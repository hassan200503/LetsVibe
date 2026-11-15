/**
 * Seeds a generic demo couple so a fresh clone has something to explore.
 * Safe to run repeatedly: existing demo rows are kept.
 *
 * Passcodes come from SEED_ALEX_PASSCODE / SEED_SAM_PASSCODE. When they are
 * missing, random passphrases are generated and appended to .env.local (which
 * git ignores); they are never printed.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { passphrase } from "../src/lib/auth/passphrase";
import { BRAND } from "@letsvibe/domain";
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db/client";
import { interests, people, preferences, projects, radarItems, radarLanes, relationshipMembers, relationships, skills } from "../src/lib/db/schema";

type DemoSlug = "alex" | "sam";
const DEMO_SLUGS = new Set<DemoSlug>(["alex", "sam"]);

function passcodeFor(slug: DemoSlug): string {
  const key = `SEED_${slug.toUpperCase()}_PASSCODE`;
  const existing = process.env[key];
  if (existing) return existing;
  const generated = passphrase();
  const envFile = ".env.local";
  const current = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
  appendFileSync(envFile, `${current && !current.endsWith("\n") ? "\n" : ""}${key}=${generated}\n`);
  console.log(`  generated a passcode for ${slug} -> saved in .env.local as ${key}`);
  return generated;
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

  async function ensurePerson(values: Omit<typeof people.$inferInsert, "passwordHash">) {
    const found = bySlug.get(values.slug);
    if (found) return found;
    const passwordHash = await bcrypt.hash(passcodeFor(values.slug as DemoSlug), 12);
    const [row] = await db.insert(people).values({ ...values, passwordHash }).returning();
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
    theme: "us",
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
    theme: "us",
    journalTitle: "Field Notes",
    radarTitle: "Nature Radar",
    features: [],
  });

  let [rel] = await db.select().from(relationships).limit(1);
  if (!rel) {
    [rel] = await db.insert(relationships).values({ name: BRAND.defaultSpaceName }).returning();
    console.log("  created relationship");
  }
  await db
    .insert(relationshipMembers)
    .values([
      { relationshipId: rel.id, personId: alex.id },
      { relationshipId: rel.id, personId: sam.id },
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
