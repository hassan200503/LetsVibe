import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

const holder = vi.hoisted(() => ({ db: undefined as unknown }));

vi.mock("@/lib/db/client", () => ({
  getDb: async () => holder.db,
}));

import {
  authenticate,
  changePassword,
  consumeAttempt,
  GENERIC_LOGIN_ERROR,
  recoverAccount,
  registerCouple,
  revokeOtherSessions,
  THROTTLED,
  verifyPassword,
} from "@/lib/auth/accounts";
import { consumeInvitation, createInvitation, findInvitation, revokeInvitations } from "@/lib/auth/invite";
import { ctxFor } from "@/lib/context";

type DbArg = Parameters<typeof registerCouple>[0];

let client: PGlite;
let appDb: DbArg;

const PASSWORD = "correct horse battery";
const SIGNUP = {
  email: "Alex@Example.com",
  password: PASSWORD,
  displayName: "Alex",
  theme: "us" as const,
  worldName: "Our World",
  topics: ["software", "nature"],
};

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  appDb = db as unknown as DbArg;
  holder.db = db;
}, 60_000);

beforeEach(async () => {
  await client.exec('TRUNCATE TABLE "auth_attempts", "people", "couples" RESTART IDENTITY CASCADE');
}, 30_000);

afterAll(async () => {
  await client.close();
});

async function register(overrides: Partial<typeof SIGNUP> = {}) {
  const result = await registerCouple(appDb, { ...SIGNUP, ...overrides });
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("self-serve registration", () => {
  it("creates one couple with one active member, their interests and preferences", async () => {
    const created = await register();
    expect(created.recoveryCode).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}$/);

    const [person] = await appDb.select().from(schema.people).where(eq(schema.people.id, created.personId));
    expect(person.email).toBe("alex@example.com");
    expect(person.passwordHash).not.toContain(PASSWORD);
    expect(await verifyPassword(PASSWORD, person.passwordHash)).toBe(true);
    expect(person.recoveryHash).toMatch(/^[a-f0-9]{64}$/);

    const members = await appDb.select().from(schema.coupleMembers).where(eq(schema.coupleMembers.coupleId, created.coupleId));
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ personId: created.personId, slot: 1, status: "active" });

    const interests = await appDb.select().from(schema.interests).where(eq(schema.interests.personId, created.personId));
    expect(interests.map((i) => i.topic)).toEqual(["software", "nature"]);

    const preferences = await appDb.select().from(schema.preferences).where(eq(schema.preferences.personId, created.personId));
    expect(preferences).toHaveLength(1);
  });

  it("refuses a second account with the same email in any case, without creating a couple", async () => {
    await register();
    const duplicate = await registerCouple(appDb, { ...SIGNUP, email: "  alex@example.COM " });
    expect(duplicate).toEqual({ ok: false, error: "An account with this email already exists. Sign in instead." });

    const [count] = await appDb.select({ n: sql<number>`count(*)::int` }).from(schema.couples);
    expect(count.n).toBe(1);
  });

  it("rejects a short password before touching the database", async () => {
    const result = await registerCouple(appDb, { ...SIGNUP, password: "short" });
    expect(result.ok).toBe(false);
    const [count] = await appDb.select({ n: sql<number>`count(*)::int` }).from(schema.people);
    expect(count.n).toBe(0);
  });
});

describe("sign in", () => {
  it("accepts the right password and is case-insensitive about the email", async () => {
    const created = await register();
    const result = await authenticate(appDb, { email: "ALEX@example.com", password: PASSWORD, ip: "1.2.3.4" });
    expect(result).toMatchObject({ ok: true, personId: created.personId, slug: "alex" });
  });

  it("never reveals whether the account or only the password was wrong", async () => {
    await register();
    const wrongPassword = await authenticate(appDb, { email: "alex@example.com", password: "not the password", ip: "1.2.3.4" });
    const noAccount = await authenticate(appDb, { email: "nobody@example.com", password: PASSWORD, ip: "1.2.3.4" });
    expect(wrongPassword).toEqual({ ok: false, error: GENERIC_LOGIN_ERROR });
    expect(noAccount).toEqual({ ok: false, error: GENERIC_LOGIN_ERROR });
  });

  it("throttles an account after repeated failures, and clears the count on success", async () => {
    await register();
    for (let i = 0; i < 10; i += 1) {
      await authenticate(appDb, { email: "alex@example.com", password: "wrong", ip: `10.0.0.${i}` });
    }
    const blocked = await authenticate(appDb, { email: "alex@example.com", password: PASSWORD, ip: "10.0.0.99" });
    expect(blocked).toEqual({ ok: false, error: THROTTLED });

    // Another account is unaffected by this one's bucket.
    const other = await authenticate(appDb, { email: "somebody@example.com", password: PASSWORD, ip: "10.0.0.99" });
    expect(other).toEqual({ ok: false, error: GENERIC_LOGIN_ERROR });
  }, 60_000);
});

describe("session version", () => {
  it("invalidates every token issued before a password change", async () => {
    const created = await register();
    expect(await ctxFor(created.personId, created.sessionVersion)).not.toBeNull();

    const changed = await changePassword(appDb, created.personId, PASSWORD, "a brand new password");
    expect(changed).toEqual({ ok: true, sessionVersion: created.sessionVersion + 1 });

    expect(await ctxFor(created.personId, created.sessionVersion)).toBeNull();
    expect(await ctxFor(created.personId, changed.ok ? changed.sessionVersion : -1)).not.toBeNull();

    expect((await authenticate(appDb, { email: SIGNUP.email, password: PASSWORD, ip: "5.5.5.5" })).ok).toBe(false);
    expect((await authenticate(appDb, { email: SIGNUP.email, password: "a brand new password", ip: "5.5.5.5" })).ok).toBe(true);
  });

  it("increments again when signing out everywhere", async () => {
    const created = await register();
    const version = await revokeOtherSessions(appDb, created.personId);
    expect(version).toBe(created.sessionVersion + 1);
    expect(await ctxFor(created.personId, created.sessionVersion)).toBeNull();
  });
});

describe("recovery", () => {
  it("refuses a wrong code with the same message as an unknown account", async () => {
    await register();
    const wrong = await recoverAccount(appDb, { email: SIGNUP.email, code: "AAAAA-AAAAA-AAAAA-AAAAA", newPassword: "another password here", ip: "6.6.6.6" });
    const missing = await recoverAccount(appDb, { email: "nobody@example.com", code: "AAAAA-AAAAA-AAAAA-AAAAA", newPassword: "another password here", ip: "6.6.6.6" });
    expect(wrong).toEqual({ ok: false, error: "That email or recovery code isn't right." });
    expect(missing).toEqual(wrong);
  });

  it("resets the password, rotates the code and revokes old sessions", async () => {
    const created = await register();
    const recovered = await recoverAccount(appDb, {
      email: SIGNUP.email,
      code: created.recoveryCode.toLowerCase(),
      newPassword: "an entirely new password",
      ip: "6.6.6.6",
    });
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(recovered.recoveryCode).not.toBe(created.recoveryCode);
    expect(recovered.sessionVersion).toBe(created.sessionVersion + 1);
    expect(await ctxFor(created.personId, created.sessionVersion)).toBeNull();

    // The code is single-use.
    const reused = await recoverAccount(appDb, { email: SIGNUP.email, code: created.recoveryCode, newPassword: "yet another password", ip: "6.6.6.6" });
    expect(reused.ok).toBe(false);
    const rotated = await recoverAccount(appDb, { email: SIGNUP.email, code: recovered.recoveryCode, newPassword: "yet another password", ip: "6.6.6.6" });
    expect(rotated.ok).toBe(true);
  });
});

describe("attempt buckets", () => {
  it("allows exactly the limit inside a window, then resets once the window passes", async () => {
    for (let i = 0; i < 3; i += 1) expect(await consumeAttempt(appDb, "ip", "unit-test", 3, 60_000)).toBe(true);
    expect(await consumeAttempt(appDb, "ip", "unit-test", 3, 60_000)).toBe(false);

    const [row] = await appDb.select().from(schema.authAttempts);
    await appDb.update(schema.authAttempts).set({ resetAt: new Date(Date.now() - 1_000) }).where(eq(schema.authAttempts.key, row.key));
    expect(await consumeAttempt(appDb, "ip", "unit-test", 3, 60_000)).toBe(true);
  });
});

describe("partner invitations", () => {
  async function owner() {
    const created = await register();
    return created;
  }

  it("stores only a hash and works exactly once", async () => {
    const created = await owner();
    const token = await createInvitation(appDb, created.coupleId, created.personId);

    const [stored] = await appDb.select().from(schema.invitations).where(eq(schema.invitations.coupleId, created.coupleId));
    expect(stored.tokenHash).not.toContain(token);
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const invite = await findInvitation(appDb, token);
    expect(invite).toMatchObject({ coupleId: created.coupleId });

    const [partner] = await appDb.insert(schema.people).values({ slug: "sam", displayName: "Sam", theme: "nature", passwordHash: "not-used" }).returning();
    const consumed = await appDb.transaction((trx) => consumeInvitation(trx as never, invite!.id, partner.id));
    expect(consumed).toBe(true);

    expect(await findInvitation(appDb, token)).toBeNull();
    const again = await appDb.transaction((trx) => consumeInvitation(trx as never, invite!.id, partner.id));
    expect(again).toBe(false);
  });

  it("revokes the previous link when a new one is made, and can revoke all", async () => {
    const created = await owner();
    const first = await createInvitation(appDb, created.coupleId, created.personId);
    const second = await createInvitation(appDb, created.coupleId, created.personId);

    expect(await findInvitation(appDb, first)).toBeNull();
    expect(await findInvitation(appDb, second)).not.toBeNull();

    await revokeInvitations(appDb, created.coupleId);
    expect(await findInvitation(appDb, second)).toBeNull();
  });

  it("refuses an expired link", async () => {
    const created = await owner();
    const token = await createInvitation(appDb, created.coupleId, created.personId);
    await appDb
      .update(schema.invitations)
      .set({ createdAt: new Date(Date.now() - 8 * 24 * 60 * 60_000), expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(schema.invitations.coupleId, created.coupleId));
    expect(await findInvitation(appDb, token)).toBeNull();
  });

  it("treats unknown and oversized tokens as invalid", async () => {
    expect(await findInvitation(appDb, "")).toBeNull();
    expect(await findInvitation(appDb, "x".repeat(201))).toBeNull();
    expect(await findInvitation(appDb, "never-issued")).toBeNull();
  });
});
