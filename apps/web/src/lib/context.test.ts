import path from "node:path";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./db/schema";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

const session = vi.hoisted(() => ({ personId: "" }));
const holder = vi.hoisted(() => ({ db: undefined as unknown }));

vi.mock("@/lib/auth/session", () => ({
  readSession: async () => (session.personId ? { personId: session.personId, slug: "any" } : null),
}));
vi.mock("@/lib/db/client", () => ({ getDb: async () => holder.db }));

import { ctxFor, getCtx, memberBySlug, visibleTo, type Ctx } from "./context";
import { mediaByIds } from "./media/queries";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let client: PGlite;
let db: Db;

async function person(slug: string) {
  const [row] = await db
    .insert(schema.people)
    .values({ slug, displayName: `${slug} Person`, theme: "us", passwordHash: "not-used-in-context-tests" })
    .returning();
  return row;
}

async function couple(name: string) {
  const [row] = await db.insert(schema.couples).values({ name }).returning();
  return row;
}

/** Two couples of two: the only shape the product ships today. */
async function seed() {
  const ours = await couple("Ours");
  const theirs = await couple("Theirs");
  const alex = await person("alex");
  const sam = await person("sam");
  const kim = await person("kim");
  const robin = await person("robin");
  await db.insert(schema.coupleMembers).values([
    { coupleId: ours.id, personId: alex.id, slot: 1 },
    { coupleId: ours.id, personId: sam.id, slot: 2 },
    { coupleId: theirs.id, personId: kim.id, slot: 1 },
    { coupleId: theirs.id, personId: robin.id, slot: 2 },
  ]);
  return { ours, theirs, alex, sam, kim, robin };
}

async function ctxOf(personId: string): Promise<Ctx> {
  const ctx = await ctxFor(personId);
  if (!ctx) throw new Error("expected a context");
  return ctx;
}

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  holder.db = db;
}, 60_000);

beforeEach(async () => {
  session.personId = "";
  await client.exec('TRUNCATE TABLE "consents", "invitations", "profiles", "couple_members", "couples", "people" RESTART IDENTITY CASCADE');
}, 30_000);

afterAll(async () => {
  await client.close();
});

describe("ctxFor", () => {
  it("resolves the couple and the partner from the person alone", async () => {
    const s = await seed();
    const ctx = await ctxFor(s.alex.id);
    expect(ctx?.relationship.id).toBe(s.ours.id);
    expect(ctx?.me.id).toBe(s.alex.id);
    expect(ctx?.partner?.id).toBe(s.sam.id);
    expect(ctx?.partners.map((p) => p.id)).toEqual([s.sam.id]);
    expect(ctx?.members.map((m) => m.id)).toEqual([s.alex.id, s.sam.id]);
  });

  it("hands out the other half's view of the same couple", async () => {
    const s = await seed();
    const sams = await ctxOf(s.sam.id);
    expect(sams.relationship.id).toBe(s.ours.id);
    expect(sams.me.id).toBe(s.sam.id);
    expect(sams.partner?.id).toBe(s.alex.id);
  });

  it("never carries a password hash into a context", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    expect("passwordHash" in ctx.me).toBe(false);
    expect("passwordHash" in (ctx.partner ?? {})).toBe(false);
  });

  it("has no partner until the second person joins", async () => {
    const alone = await couple("Alone");
    const solo = await person("solo");
    await db.insert(schema.coupleMembers).values({ coupleId: alone.id, personId: solo.id, slot: 1 });
    const ctx = await ctxOf(solo.id);
    expect(ctx.relationship.id).toBe(alone.id);
    expect(ctx.partner).toBeNull();
    expect(ctx.partners).toEqual([]);
  });

  it("is null for someone who belongs to no couple, and for an unknown id", async () => {
    const s = await seed();
    const lone = await person("lone");
    expect(await ctxFor(lone.id)).toBeNull();
    expect(await ctxFor(s.ours.id)).toBeNull();
    expect(await ctxFor("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("fails closed rather than guess if a person is ever in two active couples", async () => {
    const s = await seed();
    // The database forbids this (`couple_members_active_person`); drop the guard to
    // prove what the application does if the invariant is ever written around.
    await client.exec('DROP INDEX "couple_members_active_person"');
    const third = await couple("Third");
    await db.insert(schema.coupleMembers).values({ coupleId: third.id, personId: s.alex.id, slot: 1 });

    await expect(ctxFor(s.alex.id)).rejects.toThrow(/belongs to 2 active couples/);

    await db
      .delete(schema.coupleMembers)
      .where(and(eq(schema.coupleMembers.coupleId, third.id), eq(schema.coupleMembers.personId, s.alex.id)));
    await client.exec('CREATE UNIQUE INDEX "couple_members_active_person" ON "couple_members" ("person_id") WHERE "status" = \'active\'');
  });
});

describe("getCtx", () => {
  it("takes the couple from the verified session", async () => {
    const s = await seed();
    session.personId = s.sam.id;
    const ctx = await getCtx();
    expect(ctx?.relationship.id).toBe(s.ours.id);
    expect(ctx?.me.id).toBe(s.sam.id);
    session.personId = "";
  });
});

describe("context helpers", () => {
  it("resolves a slug only among the people in this couple", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    const stranger = await person("stranger");
    expect((await memberBySlug(ctx, s.sam.slug))?.id).toBe(s.sam.id);
    expect((await memberBySlug(ctx, s.alex.slug))?.id).toBe(s.alex.id);
    expect(await memberBySlug(ctx, stranger.slug)).toBeNull();
    expect(await memberBySlug(ctx, "nobody")).toBeNull();
  });

  it("gives the owner everything and the partner only shared rows", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    expect(visibleTo(ctx, s.alex.id)).toEqual(["private", "shared", "public"]);
    expect(visibleTo(ctx, s.sam.id)).toEqual(["shared", "public"]);
  });

  it("reads nothing for an id that belongs to another couple", async () => {
    const s = await seed();
    const ctx = await ctxOf(s.alex.id);
    const [oursItem] = await db
      .insert(schema.media)
      .values({ coupleId: s.ours.id, addedBy: s.alex.id, kind: "photo", source: "upload", path: "rel/ours/a.jpg" })
      .returning();
    const [theirItem] = await db
      .insert(schema.media)
      .values({ coupleId: s.theirs.id, addedBy: s.kim.id, kind: "photo", source: "upload", path: "rel/theirs/b.jpg" })
      .returning();

    expect((await mediaByIds(ctx, [oursItem.id])).map((m) => m.id)).toEqual([oursItem.id]);
    expect(await mediaByIds(ctx, [theirItem.id])).toEqual([]);
  });
});
