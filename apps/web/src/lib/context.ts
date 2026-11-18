import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { coupleMembers, couples, people, type Person } from "@/lib/db/schema";
import { readSession } from "@/lib/auth/session";
import { viewUrl } from "@/lib/media/storage";

export type PublicPerson = Omit<Person, "passwordHash"> & { avatarUrl: string | null };

async function strip(p: Person): Promise<PublicPerson> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = p;
  const avatarUrl = p.avatarPath ? await viewUrl(p.avatarPath).catch(() => null) : null;
  return { ...rest, avatarUrl };
}

export type Ctx = {
  me: PublicPerson;
  relationship: typeof couples.$inferSelect;
  /** Everyone else in the relationship (one person today, but not assumed). */
  partners: PublicPerson[];
  members: PublicPerson[];
};

/** Someone's context by id: their relationship and partner. Only for trusted server code. */
export async function ctxFor(personId: string): Promise<Ctx | null> {
  const db = await getDb();
  const [me] = await db.select().from(people).where(eq(people.id, personId));
  if (!me) return null;
  const [link] = await db
    .select({ r: couples })
    .from(coupleMembers)
    .innerJoin(couples, eq(couples.id, coupleMembers.coupleId))
    .where(and(eq(coupleMembers.personId, me.id), eq(coupleMembers.status, "active")))
    .limit(1);
  if (!link) return null;
  const others = await db
    .select({ p: people })
    .from(coupleMembers)
    .innerJoin(people, eq(people.id, coupleMembers.personId))
    .where(and(eq(coupleMembers.coupleId, link.r.id), eq(coupleMembers.status, "active"), ne(people.id, me.id)));
  const [meP, ...partners] = await Promise.all([strip(me), ...others.map((o) => strip(o.p))]);
  return { me: meP, relationship: link.r, partners, members: [meP, ...partners] };
}

/** The signed-in person and their relationship, or null. Cached per request. */
export const getCtx = cache(async (): Promise<Ctx | null> => {
  const session = await readSession();
  return session ? ctxFor(session.personId) : null;
});

/** For pages and actions: the context, or a redirect to sign in. */
export async function requireCtx(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  return ctx;
}

/** A relationship member by slug, or null. Outsiders can never be resolved here. */
export async function memberBySlug(ctx: Ctx, slug: string): Promise<PublicPerson | null> {
  return ctx.members.find((m) => m.slug === slug) ?? null;
}

/**
 * Visibility rule used everywhere: the owner sees everything; other members of
 * the relationship see "shared" and "public"; nobody else sees anything but
 * "public" (and only via the public profile).
 */
export function visibleTo(ctx: Ctx, ownerId: string): ("private" | "shared" | "public")[] {
  return ctx.me.id === ownerId ? ["private", "shared", "public"] : ["shared", "public"];
}
