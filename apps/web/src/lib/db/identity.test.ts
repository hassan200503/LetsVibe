import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq, gt, isNull } from "drizzle-orm";
import path from "node:path";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let client: PGlite;
let db: Db;

async function person(name: string) {
  const [row] = await db
    .insert(schema.people)
    .values({ slug: name, displayName: name, theme: "us", passwordHash: "not-used-in-schema-tests" })
    .returning();
  return row;
}

async function couple(name: string) {
  const [row] = await db.insert(schema.couples).values({ name }).returning();
  return row;
}

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}, 60_000);

beforeEach(async () => {
  await client.exec('TRUNCATE TABLE "consents", "invitations", "profiles", "couple_members", "couples", "people" RESTART IDENTITY CASCADE');
}, 30_000);

afterAll(async () => {
  await client.close();
});

describe("identity constraints", () => {
  it("allows at most two active members per couple", async () => {
    const c = await couple("Two");
    const a = await person("slot-a");
    const b = await person("slot-b");
    const d = await person("slot-c");

    await db.insert(schema.coupleMembers).values([
      { coupleId: c.id, personId: a.id, slot: 1 },
      { coupleId: c.id, personId: b.id, slot: 2 },
    ]);

    await expect(db.insert(schema.coupleMembers).values({ coupleId: c.id, personId: d.id, slot: 3 })).rejects.toThrow();
    await expect(db.insert(schema.coupleMembers).values({ coupleId: c.id, personId: d.id, slot: 1 })).rejects.toThrow();
  });

  it("allows only one active couple per person", async () => {
    const first = await couple("First");
    const second = await couple("Second");
    const p = await person("one-active-couple");

    await db.insert(schema.coupleMembers).values({ coupleId: first.id, personId: p.id, slot: 1 });
    await expect(
      db.insert(schema.coupleMembers).values({ coupleId: second.id, personId: p.id, slot: 1 }),
    ).rejects.toThrow();

    await db
      .update(schema.coupleMembers)
      .set({ status: "left" })
      .where(and(eq(schema.coupleMembers.coupleId, first.id), eq(schema.coupleMembers.personId, p.id)));
    await expect(
      db.insert(schema.coupleMembers).values({ coupleId: second.id, personId: p.id, slot: 1 }),
    ).resolves.toBeDefined();
  });

  it("accepts an invitation at most once", async () => {
    const c = await couple("Invite");
    const host = await person("host");
    const guest = await person("guest");
    const tokenHash = "a".repeat(64);

    const [invite] = await db
      .insert(schema.invitations)
      .values({ coupleId: c.id, tokenHash, createdBy: host.id, expiresAt: new Date(Date.now() + 60_000) })
      .returning();

    const pending = () =>
      and(eq(schema.invitations.id, invite.id), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, new Date()));
    const [accepted] = await db
      .update(schema.invitations)
      .set({ acceptedBy: guest.id, acceptedAt: new Date() })
      .where(pending())
      .returning();
    expect(accepted?.acceptedBy).toBe(guest.id);

    const second = await db
      .update(schema.invitations)
      .set({ acceptedBy: guest.id, acceptedAt: new Date() })
      .where(pending())
      .returning();
    expect(second).toHaveLength(0);
  });

  it("rejects duplicate invitation token hashes", async () => {
    const c = await couple("Duplicate");
    const host = await person("duplicate-host");
    const expiresAt = new Date(Date.now() + 60_000);
    const tokenHash = "b".repeat(64);

    await db.insert(schema.invitations).values({ coupleId: c.id, tokenHash, createdBy: host.id, expiresAt });
    await expect(db.insert(schema.invitations).values({ coupleId: c.id, tokenHash, createdBy: host.id, expiresAt })).rejects.toThrow();
  });

  it("keeps one profile and one consent version per person", async () => {
    const p = await person("profile-owner");
    await db.insert(schema.profiles).values({ personId: p.id });
    await expect(db.insert(schema.profiles).values({ personId: p.id })).rejects.toThrow();

    await db.insert(schema.consents).values({ personId: p.id, kind: "terms", version: "2026-11" });
    await expect(db.insert(schema.consents).values({ personId: p.id, kind: "terms", version: "2026-11" })).rejects.toThrow();
  });
});
