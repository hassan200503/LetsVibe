import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

/**
 * E2-001. `0010_couple_id.sql` rewrites the tenant column on 18 tables in one
 * pass, so the things worth proving are: the value that was there survives, the
 * child tables inherit the parent's couple rather than a value of their own, and
 * once the composite keys are in place a row can no longer name a parent that
 * belongs to somebody else. Everything below runs against the real migration
 * files on PGlite, with two couples in the database on purpose.
 */

const folder = path.join(process.cwd(), "drizzle");
const client = new PGlite();

async function apply(name: string) {
  const sql = fs.readFileSync(path.join(folder, name), "utf8");
  for (const statement of sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean)) {
    await client.exec(statement);
  }
}

const before = [
  "0000_init.sql",
  "0001_photos.sql",
  "0002_together.sql",
  "0003_chat_calls.sql",
  "0004_reach.sql",
  "0005_research.sql",
  "0006_identity.sql",
  "0007_mysterious_puff_adder.sql",
  "0008_jittery_ultragirl.sql",
  "0009_flowery_franklin_richards.sql",
];

const ours = "10000000-0000-4000-8000-00000000000a";
const theirs = "10000000-0000-4000-8000-00000000000b";
const alex = "20000000-0000-4000-8000-000000000001";
const sam = "20000000-0000-4000-8000-000000000002";
const ourMedia = "40000000-0000-4000-8000-000000000001";
const theirMedia = "40000000-0000-4000-8000-000000000002";
const ourRitual = "50000000-0000-4000-8000-000000000001";

/** The 18 tables `0010_couple_id.sql` rewrites. */
const coupleOwned = [
  "call_signals",
  "calls",
  "chat_state",
  "couple_members",
  "daily_answers",
  "media",
  "media_comments",
  "media_reactions",
  "memories",
  "messages",
  "photos",
  "research_messages",
  "research_threads",
  "ritual_checks",
  "rituals",
  "room_events",
  "room_state",
  "shared_learning",
];

beforeAll(async () => {
  for (const migration of before) await apply(migration);

  await client.query(`INSERT INTO "couples" ("id","name","started_on") VALUES ($1,'Ours','2024-02-14'), ($2,'Theirs','2023-01-01')`, [ours, theirs]);
  await client.query(
    `INSERT INTO "people" ("id","slug","display_name","theme","password_hash") VALUES ($1,'alex','Alex','us','hash'), ($2,'sam','Sam','sage','hash')`,
    [alex, sam],
  );
  await client.query(`INSERT INTO "couple_members" ("relationship_id","person_id","slot") VALUES ($1,$2,1), ($1,$3,2)`, [ours, alex, sam]);

  // Content written the way the pre-E2-001 code wrote it: relationship_id only.
  await client.query(`INSERT INTO "memories" ("relationship_id","added_by","title","occurred_on") VALUES ($1,$2,'Kept','2025-01-01')`, [ours, alex]);
  await client.query(`INSERT INTO "media" ("id","relationship_id","added_by","kind","source") VALUES ($1,$2,$3,'photo','upload'), ($4,$5,$3,'photo','upload')`, [
    ourMedia,
    ours,
    alex,
    theirMedia,
    theirs,
  ]);
  await client.query(`INSERT INTO "media_reactions" ("media_id","person_id","emoji") VALUES ($1,$2,'❤️')`, [ourMedia, alex]);
  await client.query(`INSERT INTO "rituals" ("id","relationship_id","created_by","title") VALUES ($1,$2,$3,'Good morning text')`, [ourRitual, ours, alex]);
  await client.query(`INSERT INTO "ritual_checks" ("ritual_id","day","person_id") VALUES ($1,'2026-01-01',$2)`, [ourRitual, alex]);
  await client.query(`INSERT INTO "room_state" ("relationship_id","title") VALUES ($1,'First dance')`, [ours]);
  await client.query(`INSERT INTO "daily_answers" ("relationship_id","day","person_id","answer") VALUES ($1,'2026-01-01',$2,'Yes')`, [ours, alex]);
  await client.query(`INSERT INTO "messages" ("relationship_id","sender_id","body") VALUES ($1,$2,'hey')`, [ours, alex]);

  await apply("0010_couple_id.sql");
  await apply("0011_drop_legacy_relationship.sql");
}, 120_000);

afterAll(async () => {
  await client.close();
});

describe("couple_id migration", () => {
  it("keeps the value a table already had", async () => {
    for (const table of ["memories", "rituals", "room_state", "daily_answers", "messages", "couple_members"]) {
      const { rows } = await client.query<{ couple_id: string }>(`SELECT DISTINCT "couple_id" FROM "${table}"`);
      expect(rows, table).toEqual([{ couple_id: ours }]);
    }

    // Both couples' media kept their own couple, not the first one found.
    const media = await client.query<{ couple_id: string }>(`SELECT "couple_id" FROM "media" ORDER BY "couple_id"`);
    expect(media.rows.map((r) => r.couple_id).sort()).toEqual([ours, theirs].sort());
  });

  it("gives a child row its parent's couple", async () => {
    const reactions = await client.query<{ couple_id: string }>(`SELECT "couple_id" FROM "media_reactions"`);
    expect(reactions.rows).toEqual([{ couple_id: ours }]);

    const checks = await client.query<{ couple_id: string }>(`SELECT "couple_id" FROM "ritual_checks"`);
    expect(checks.rows).toEqual([{ couple_id: ours }]);
  });

  it("leaves no legacy column and no nullable tenant", async () => {
    const legacy = await client.query(`SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'relationship_id'`);
    expect(legacy.rows).toEqual([]);

    const tenant = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'couple_id' AND is_nullable = 'NO' ORDER BY table_name`,
    );
    const found = tenant.rows.map((r) => r.table_name);
    for (const table of coupleOwned) expect(found, table).toContain(table);
  });

  it("moves the primary keys onto the tenant column", async () => {
    const keys = await client.query<{ table_name: string; column_name: string }>(
      `SELECT tc.table_name, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_name IN ('room_state','couple_members','daily_answers')
        ORDER BY tc.table_name, kcu.ordinal_position`,
    );
    expect(keys.rows).toEqual([
      { table_name: "couple_members", column_name: "couple_id" },
      { table_name: "couple_members", column_name: "person_id" },
      { table_name: "daily_answers", column_name: "couple_id" },
      { table_name: "daily_answers", column_name: "day" },
      { table_name: "daily_answers", column_name: "person_id" },
      { table_name: "room_state", column_name: "couple_id" },
    ]);
  });

  it("refuses a child row that points at another couple's parent", async () => {
    const foreignReaction = client.query(`INSERT INTO "media_reactions" ("media_id","person_id","couple_id","emoji") VALUES ($1,$2,$3,'👍')`, [
      theirMedia,
      alex,
      ours,
    ]);
    await expect(foreignReaction).rejects.toThrow(/foreign key constraint/i);

    const foreignCheck = client.query(`INSERT INTO "ritual_checks" ("ritual_id","couple_id","day","person_id") VALUES ($1,$2,'2026-02-02',$3)`, [
      ourRitual,
      theirs,
      alex,
    ]);
    await expect(foreignCheck).rejects.toThrow(/foreign key constraint/i);
  });

  it("still accepts a child row that agrees with its parent", async () => {
    await client.query(`INSERT INTO "media_reactions" ("media_id","person_id","couple_id","emoji") VALUES ($1,$2,$3,'👍')`, [ourMedia, sam, ours]);
    const { rows } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM "media_reactions"`);
    expect(rows).toEqual([{ n: 2 }]);
  });
});
