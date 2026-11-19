import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { people, projects, skills } from "@/lib/db/schema";

/**
 * E2-005 — the public profile, in one place.
 *
 * Two rules hold here rather than in the page that renders them:
 *
 *  1. Reachability. A public profile is addressed by `public_handle`, an opaque
 *     value written only while the opt-in is on. It is deliberately *not* the
 *     account handle, so no public URL discloses a credential, and no profile
 *     that was never opted in is reachable at all.
 *  2. Content. `PUBLIC_PERSON_FIELDS` is the whole allowlist and every select
 *     below names its columns, so widening a page can never widen a read:
 *     nicknames, birthdays, memories, journals, vaults, and anything not marked
 *     🌍 Public are not addressable from this module.
 */

export const PUBLIC_PERSON_FIELDS = ["displayName", "headline", "course", "intro", "theme"] as const;

export type PublicProfile = {
  handle: string;
  displayName: string;
  headline: string | null;
  course: string | null;
  intro: string | null;
  theme: string;
  skills: { id: string; name: string; category: string; level: number }[];
  projects: { id: string; name: string; description: string | null; stack: string[]; repoUrl: string | null; liveUrl: string | null }[];
};

/** A fresh opaque handle. Not the account handle: a URL must never be a login. */
export function newPublicHandle(): string {
  return randomBytes(16).toString("base64url");
}

/** Looks a public profile up by its handle. Switched off, or unknown: null. */
export async function publicProfileByHandle(handle: string): Promise<PublicProfile | null> {
  if (!handle || handle.length > 64) return null;
  const db = await getDb();
  const [p] = await db
    .select({
      id: people.id,
      handle: people.publicHandle,
      displayName: people.displayName,
      headline: people.headline,
      course: people.course,
      intro: people.intro,
      theme: people.theme,
    })
    .from(people)
    .where(and(eq(people.publicHandle, handle), eq(people.publicProfile, true)));
  if (!p || !p.handle) return null;

  const [sk, pr] = await Promise.all([
    db
      .select({ id: skills.id, name: skills.name, category: skills.category, level: skills.level })
      .from(skills)
      .where(and(eq(skills.personId, p.id), eq(skills.visibility, "public")))
      .orderBy(desc(skills.primary), asc(skills.position)),
    db
      .select({ id: projects.id, name: projects.name, description: projects.description, stack: projects.stack, repoUrl: projects.repoUrl, liveUrl: projects.liveUrl })
      .from(projects)
      .where(and(eq(projects.personId, p.id), eq(projects.visibility, "public")))
      .orderBy(desc(projects.current), desc(projects.updatedAt)),
  ]);

  return { handle: p.handle, displayName: p.displayName, headline: p.headline, course: p.course, intro: p.intro, theme: p.theme, skills: sk, projects: pr };
}
