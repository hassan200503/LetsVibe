import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

const folder = path.join(process.cwd(), "drizzle");
const client = new PGlite();

async function apply(name: string) {
  const sql = fs.readFileSync(path.join(folder, name), "utf8");
  for (const statement of sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean)) {
    await client.exec(statement);
  }
}

const coupleId = "10000000-0000-4000-8000-000000000001";
const alexId = "20000000-0000-4000-8000-000000000001";
const samId = "20000000-0000-4000-8000-000000000002";
const memoryId = "30000000-0000-4000-8000-000000000001";

beforeAll(async () => {
  for (const migration of ["0000_init.sql", "0001_photos.sql", "0002_together.sql", "0003_chat_calls.sql", "0004_reach.sql", "0005_research.sql"]) {
    await apply(migration);
  }
  await client.query(
    `INSERT INTO "people" ("id", "slug", "display_name", "theme", "password_hash") VALUES
      ($1, 'alex', 'Alex', 'us', 'hash'),
      ($2, 'sam', 'Sam', 'sage', 'hash')`,
    [alexId, samId],
  );
  await client.query(`INSERT INTO "relationships" ("id", "name", "started_on") VALUES ($1, 'Legacy world', '2024-02-14')`, [coupleId]);
  await client.query(
    `INSERT INTO "relationship_members" ("relationship_id", "person_id") VALUES ($1, $2), ($1, $3)`,
    [coupleId, alexId, samId],
  );
  await client.query(
    `INSERT INTO "memories" ("id", "relationship_id", "added_by", "title", "occurred_on") VALUES ($1, $2, $3, 'Kept', '2025-01-01')`,
    [memoryId, coupleId, alexId],
  );
  await apply("0006_identity.sql");
}, 60_000);

afterAll(async () => {
  await client.close();
});

describe("identity migration", () => {
  it("renames the legacy couple and backfills both members", async () => {
    const couples = await client.query<{ count: number; name: string }>(`SELECT count(*)::int AS count, min("name") AS name FROM "couples"`);
    expect(couples.rows).toEqual([{ count: 1, name: "Legacy world" }]);

    const members = await client.query<{ person_id: string; slot: number; status: string }>(
      `SELECT "person_id", "slot", "status" FROM "couple_members" ORDER BY "slot"`,
    );
    expect(members.rows).toEqual([
      { person_id: alexId, slot: 1, status: "active" },
      { person_id: samId, slot: 2, status: "active" },
    ]);
  });

  it("backfills profiles without losing existing content or foreign keys", async () => {
    const profiles = await client.query<{ count: number; timezone: string }>(`SELECT count(*)::int AS count, min("timezone") AS timezone FROM "profiles"`);
    expect(profiles.rows).toEqual([{ count: 2, timezone: "Africa/Nairobi" }]);

    const before = await client.query<{ count: number }>(`SELECT count(*)::int AS count FROM "memories" WHERE "id" = $1`, [memoryId]);
    expect(before.rows[0]?.count).toBe(1);

    await client.query(`DELETE FROM "couples" WHERE "id" = $1`, [coupleId]);
    const after = await client.query<{ count: number }>(`SELECT count(*)::int AS count FROM "memories" WHERE "id" = $1`, [memoryId]);
    expect(after.rows[0]?.count).toBe(0);
  });
});
