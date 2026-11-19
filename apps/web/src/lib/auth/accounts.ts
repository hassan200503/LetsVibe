import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { ThemeKey } from "@lovora/domain";
import { getDb } from "@/lib/db/client";
import { authAttempts, coupleMembers, couples, interests, people, preferences, profiles } from "@/lib/db/schema";
import { hashRecoveryCode, matchesRecovery, newRecoveryCode } from "./recovery";

export { hashRecoveryCode, newRecoveryCode } from "./recovery";

type Db = Awaited<ReturnType<typeof getDb>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const BCRYPT_COST = 12;
export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 128;

/** A bcrypt hash of a random value, compared when no account exists so timing does not reveal it. */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5W5pX1Z8sZ3J9W8X8Q0sW2m7R9oY1qS";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type AccountError = { ok: false; error: string };
export type Registered = { ok: true; personId: string; slug: string; sessionVersion: number; recoveryCode: string; coupleId: string };

export const GENERIC_LOGIN_ERROR = "Email or password is incorrect.";
export const THROTTLED = "Too many attempts. Try again in a few minutes.";
const GENERIC_RECOVERY_ERROR = "That email or recovery code isn't right.";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailProblem(email: string): string | null {
  if (!EMAIL.test(normalizeEmail(email))) return "Enter a valid email address.";
  return null;
}

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`;
  return null;
}

export function displayNameProblem(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1) return "Tell us your name.";
  if (trimmed.length > 80) return "Use 80 characters or fewer.";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function attemptKey(scope: "ip" | "account", value: string): string {
  return `${scope}:${createHash("sha256").update(value).digest("hex")}`;
}

/**
 * Counts one attempt against a bucket. Returns false when the caller has already
 * used its allowance in this window. The row is locked so parallel requests
 * cannot all read the same count.
 */
export async function consumeAttempt(db: Db, scope: "ip" | "account", value: string, limit: number, windowMs: number): Promise<boolean> {
  const key = attemptKey(scope, value);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(authAttempts).where(eq(authAttempts.key, key)).for("update");
    if (!row || row.resetAt <= now) {
      await tx
        .insert(authAttempts)
        .values({ key, count: 1, resetAt, updatedAt: now })
        .onConflictDoUpdate({ target: authAttempts.key, set: { count: 1, resetAt, updatedAt: now } });
      return true;
    }
    if (row.count >= limit) return false;
    await tx.update(authAttempts).set({ count: row.count + 1, updatedAt: now }).where(eq(authAttempts.key, key));
    return true;
  });
}

export async function clearAttempts(db: Db, scope: "ip" | "account", value: string): Promise<void> {
  await db.delete(authAttempts).where(eq(authAttempts.key, attemptKey(scope, value)));
}

const IP_WINDOW = { limit: 30, ms: 15 * 60_000 };
const ACCOUNT_WINDOW = { limit: 10, ms: 15 * 60_000 };

function baseSlug(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "me"
  );
}

async function uniqueAccountSlug(db: Db | Tx, name: string): Promise<string> {
  const base = baseSlug(name);
  for (let n = 1; n < 1000; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [found] = await db.select({ id: people.id }).from(people).where(eq(people.slug, candidate)).limit(1);
    if (!found) return candidate;
  }
  return `${base}-${randomBytes(4).toString("hex")}`;
}

async function uniqueMemberSlug(tx: Tx, coupleId: string, name: string): Promise<string> {
  const base = baseSlug(name);
  for (let n = 1; n < 1000; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [found] = await tx
      .select({ id: coupleMembers.personId })
      .from(coupleMembers)
      .where(and(eq(coupleMembers.coupleId, coupleId), eq(coupleMembers.slug, candidate)))
      .limit(1);
    if (!found) return candidate;
  }
  return `${base}-${randomBytes(4).toString("hex")}`;
}

export type MemberInput = {
  displayName: string;
  email: string;
  passwordHash: string;
  recoveryHash: string;
  theme: ThemeKey;
  topics: string[];
};

/** Inserts one person and their membership. Caller owns the transaction. */
export async function insertCoupleMember(tx: Tx, coupleId: string, slot: 1 | 2, input: MemberInput) {
  const slug = await uniqueMemberSlug(tx, coupleId, input.displayName);
  const [person] = await tx
    .insert(people)
    .values({
      slug: await uniqueAccountSlug(tx, input.displayName),
      displayName: input.displayName,
      email: input.email,
      theme: input.theme,
      passwordHash: input.passwordHash,
      recoveryHash: input.recoveryHash,
      journalTitle: "Learning Journal",
      radarTitle: "Curiosity Radar",
      features: [],
    })
    .returning({ id: people.id, sessionVersion: people.sessionVersion });
  await tx.insert(coupleMembers).values({ coupleId, personId: person.id, slug, slot });
  if (input.topics.length) {
    await tx.insert(interests).values(input.topics.map((topic, position) => ({ personId: person.id, topic, position })));
  }
  await tx.insert(preferences).values({ personId: person.id });
  await tx.insert(profiles).values({ personId: person.id, onboardingCompletedAt: new Date() });
  return { ...person, slug };
}

function duplicateEmail(error: unknown): boolean {
  const code = (error as { code?: string }).code ?? (error as { cause?: { code?: string } }).cause?.code;
  return code === "23505";
}

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  theme: ThemeKey;
  worldName: string;
  startedOn?: string | null;
  topics: string[];
};

/** Creates a new couple and its first account. Signup is self-serve; nothing is global. */
export async function registerCouple(db: Db, input: RegisterInput): Promise<Registered | AccountError> {
  const email = normalizeEmail(input.email);
  const problem = emailProblem(email) ?? passwordProblem(input.password) ?? displayNameProblem(input.displayName);
  if (problem) return { ok: false, error: problem };

  const [existing] = await db.select({ id: people.id }).from(people).where(sql`lower(${people.email}) = ${email}`).limit(1);
  if (existing) return { ok: false, error: "An account with this email already exists. Sign in instead." };

  const recoveryCode = newRecoveryCode();
  const passwordHash = await hashPassword(input.password);
  try {
    const person = await db.transaction(async (tx) => {
      const [couple] = await tx.insert(couples).values({ name: input.worldName.trim().slice(0, 60), startedOn: input.startedOn ?? null }).returning();
      const created = await insertCoupleMember(tx, couple.id, 1, {
        displayName: input.displayName.trim(),
        email,
        passwordHash,
        recoveryHash: hashRecoveryCode(recoveryCode),
        theme: input.theme,
        topics: input.topics,
      });
      return { ...created, coupleId: couple.id };
    });
    return { ok: true, personId: person.id, slug: person.slug, sessionVersion: person.sessionVersion, recoveryCode, coupleId: person.coupleId };
  } catch (error) {
    if (duplicateEmail(error)) return { ok: false, error: "An account with this email already exists. Sign in instead." };
    throw error;
  }
}

export type LoginInput = { email: string; password: string; ip: string };
export type LoginResult = { ok: true; personId: string; slug: string; sessionVersion: number } | AccountError;

/** Verifies an email and password. Errors never say whether the account exists. */
export async function authenticate(db: Db, input: LoginInput): Promise<LoginResult> {
  const email = normalizeEmail(input.email);
  const ipOk = await consumeAttempt(db, "ip", input.ip, IP_WINDOW.limit, IP_WINDOW.ms);
  const accountOk = await consumeAttempt(db, "account", email, ACCOUNT_WINDOW.limit, ACCOUNT_WINDOW.ms);
  if (!ipOk || !accountOk) return { ok: false, error: THROTTLED };

  const [person] = await db
    .select({ id: people.id, slug: people.slug, hash: people.passwordHash, version: people.sessionVersion })
    .from(people)
    .where(sql`lower(${people.email}) = ${email}`)
    .limit(1);

  const matches = await bcrypt.compare(input.password, person?.hash ?? DUMMY_HASH);
  if (!person || !matches) return { ok: false, error: GENERIC_LOGIN_ERROR };

  await clearAttempts(db, "account", email);
  return { ok: true, personId: person.id, slug: person.slug, sessionVersion: person.version };
}

export type RecoveryInput = { email: string; code: string; newPassword: string; ip: string };
export type RecoveryResult = { ok: true; personId: string; slug: string; sessionVersion: number; recoveryCode: string } | AccountError;

/** Resets a password with the one-time recovery code issued at signup, then issues a new code. */
export async function recoverAccount(db: Db, input: RecoveryInput): Promise<RecoveryResult> {
  const email = normalizeEmail(input.email);
  const passwordIssue = passwordProblem(input.newPassword);
  if (passwordIssue) return { ok: false, error: passwordIssue };

  const ipOk = await consumeAttempt(db, "ip", input.ip, 10, 15 * 60_000);
  const accountOk = await consumeAttempt(db, "account", email, 5, 15 * 60_000);
  if (!ipOk || !accountOk) return { ok: false, error: THROTTLED };

  const [person] = await db
    .select({ id: people.id, slug: people.slug, recovery: people.recoveryHash, version: people.sessionVersion })
    .from(people)
    .where(sql`lower(${people.email}) = ${email}`)
    .limit(1);

  const ok = person?.recovery ? matchesRecovery(input.code, person.recovery) : false;
  if (!person || !ok) return { ok: false, error: GENERIC_RECOVERY_ERROR };

  const recoveryCode = newRecoveryCode();
  const [updated] = await db
    .update(people)
    .set({
      passwordHash: await hashPassword(input.newPassword),
      recoveryHash: hashRecoveryCode(recoveryCode),
      sessionVersion: person.version + 1,
    })
    .where(eq(people.id, person.id))
    .returning({ version: people.sessionVersion });
  await clearAttempts(db, "account", email);
  return { ok: true, personId: person.id, slug: person.slug, sessionVersion: updated.version, recoveryCode };
}

/** Changes a password for a signed-in person. Returns the new session version. */
export async function changePassword(db: Db, personId: string, current: string, next: string): Promise<{ ok: true; sessionVersion: number } | AccountError> {
  const issue = passwordProblem(next);
  if (issue) return { ok: false, error: issue };
  const [person] = await db.select({ hash: people.passwordHash, version: people.sessionVersion }).from(people).where(eq(people.id, personId));
  if (!person || !(await verifyPassword(current, person.hash))) return { ok: false, error: "Your current password isn't right." };
  const [updated] = await db
    .update(people)
    .set({ passwordHash: await hashPassword(next), sessionVersion: person.version + 1 })
    .where(eq(people.id, personId))
    .returning({ version: people.sessionVersion });
  return { ok: true, sessionVersion: updated.version };
}

/** Revokes every other device. */
export async function revokeOtherSessions(db: Db, personId: string): Promise<number> {
  const [updated] = await db
    .update(people)
    .set({ sessionVersion: sql`${people.sessionVersion} + 1` })
    .where(eq(people.id, personId))
    .returning({ version: people.sessionVersion });
  return updated.version;
}

export function personForEmail(db: Db, email: string) {
  return db
    .select({ id: people.id })
    .from(people)
    .where(sql`lower(${people.email}) = ${normalizeEmail(email)}`)
    .limit(1);
}

