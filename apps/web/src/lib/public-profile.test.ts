import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./db/schema";

vi.mock("server-only", () => ({}));
const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/db/client", () => ({ getDb: async () => holder.db }));

import { PUBLIC_PERSON_FIELDS, newPublicHandle, publicProfileByHandle } from "./public-profile";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let client: PGlite;
let db: Db;

const HANDLE = "p_7Jm2pQxN4tR8vW1yZ3aB5c";

async function person(values: Partial<typeof schema.people.$inferInsert> = {}) {
  const [row] = await db
    .insert(schema.people)
    .values({
      slug: "alex",
      displayName: "Alex Rivera",
      nickname: "Lex",
      headline: "Builds quiet software",
      course: "Computer Science",
      focus: "Distributed systems",
      intro: "A paragraph about Alex.",
      motto: "Slow is smooth",
      birthday: "1998-04-02",
      theme: "ocean",
      passwordHash: "not-used-in-public-profile-tests",
      ...values,
    })
    .returning();
  return row;
}

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  holder.db = db;
}, 60_000);

beforeEach(async () => {
  await client.exec('TRUNCATE TABLE "skills", "projects", "consents", "invitations", "profiles", "couple_members", "couples", "people" RESTART IDENTITY CASCADE');
}, 30_000);

afterAll(async () => {
  await client.close();
});

describe("public profile", () => {
  it("is unreachable until the person opts in", async () => {
    await person({ publicProfile: false, publicHandle: HANDLE });
    expect(await publicProfileByHandle(HANDLE)).toBeNull();

    await db.update(schema.people).set({ publicProfile: true });
    expect((await publicProfileByHandle(HANDLE))?.displayName).toBe("Alex Rivera");
  });

  it("answers at its opaque handle, never at an account or member slug", async () => {
    const alex = await person({ publicProfile: true, publicHandle: HANDLE });
    const [ours] = await db.insert(schema.couples).values({ name: "Ours" }).returning();
    await db.insert(schema.coupleMembers).values({ coupleId: ours.id, personId: alex.id, slug: "alex", slot: 1 });

    expect(await publicProfileByHandle("alex")).toBeNull();
    expect(await publicProfileByHandle("lex")).toBeNull();
    expect((await publicProfileByHandle(HANDLE))?.handle).toBe(HANDLE);
  });

  it("returns the allowlist and nothing else", async () => {
    await person({ publicProfile: true, publicHandle: HANDLE });
    const p = await publicProfileByHandle(HANDLE);
    expect(p).not.toBeNull();
    expect(Object.keys(p!).sort()).toEqual([...PUBLIC_PERSON_FIELDS, "handle", "skills", "projects"].sort());
    for (const secret of ["nickname", "birthday", "focus", "motto", "slug", "passwordHash", "avatarPath", "publicProfile"]) {
      expect(secret in p!).toBe(false);
    }
  });

  it("shows only rows marked public, in their stated order", async () => {
    const alex = await person({ publicProfile: true, publicHandle: HANDLE });
    await db.insert(schema.skills).values([
      { personId: alex.id, name: "Visible", category: "Engineering", level: 4, primary: true, position: 0, visibility: "public" },
      { personId: alex.id, name: "Shared only", category: "Engineering", level: 3, position: 1, visibility: "shared" },
      { personId: alex.id, name: "Private", category: "Engineering", level: 5, position: 2, visibility: "private" },
    ]);
    await db.insert(schema.projects).values([
      { personId: alex.id, name: "Open source thing", stack: ["TypeScript"], visibility: "public", current: true },
      { personId: alex.id, name: "Quiet thing", stack: ["Rust"], visibility: "shared", current: true },
    ]);

    const p = await publicProfileByHandle(HANDLE);
    expect(p!.skills.map((s) => s.name)).toEqual(["Visible"]);
    expect(p!.projects.map((x) => x.name)).toEqual(["Open source thing"]);
    expect(JSON.stringify(p)).not.toContain("Shared only");
    expect(JSON.stringify(p)).not.toContain("Private");
  });

  it("switches off to unreachable and back on to the same link", async () => {
    await person({ publicProfile: true, publicHandle: HANDLE });
    await db.update(schema.people).set({ publicProfile: false });
    expect(await publicProfileByHandle(HANDLE)).toBeNull();
    await db.update(schema.people).set({ publicProfile: true });
    expect((await publicProfileByHandle(HANDLE))?.handle).toBe(HANDLE);
  });

  it("reflects an edit made after the first publish", async () => {
    await person({ publicProfile: true, publicHandle: HANDLE });
    await db.update(schema.people).set({ headline: "Now writes about networks" });
    expect((await publicProfileByHandle(HANDLE))?.headline).toBe("Now writes about networks");
  });

  it("mints opaque, unguessable, distinct handles", () => {
    const a = newPublicHandle();
    const b = newPublicHandle();
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(a).not.toBe(b);
    expect(a.toLowerCase()).not.toContain("alex");
  });

  it("refuses a missing, empty or absurd handle without touching the database", async () => {
    expect(await publicProfileByHandle("")).toBeNull();
    expect(await publicProfileByHandle("x".repeat(65))).toBeNull();
    expect(await publicProfileByHandle("no-such-handle")).toBeNull();
  });
});
