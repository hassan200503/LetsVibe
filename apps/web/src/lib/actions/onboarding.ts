"use server";

import bcrypt from "bcryptjs";
import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { THEME_KEYS, type ThemeKey } from "@letsvibe/domain";
import { createSession } from "@/lib/auth/session";
import { readInvite } from "@/lib/auth/invite";
import { getDb } from "@/lib/db/client";
import { coupleMembers, couples, interests, people, preferences, profiles } from "@/lib/db/schema";
import { getCtx } from "@/lib/context";
import { isTopicKey, type TopicKey } from "@/lib/trends/topics";
import { ActionState, formObject, isoDate, reqText } from "./util";
import { z } from "zod";

type Db = Awaited<ReturnType<typeof getDb>>;

const personInput = z.object({
  displayName: reqText(80),
  passcode: z.string().min(8, "Use at least 8 characters").max(128),
  confirm: z.string(),
  theme: z.enum(THEME_KEYS),
});

function chosenTopics(fd: FormData): TopicKey[] {
  return [...new Set(fd.getAll("topic").map(String).filter(isTopicKey))];
}

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

async function uniqueSlug(db: Db, name: string): Promise<string> {
  const base = baseSlug(name);
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [found] = await db.select({ id: people.id }).from(people).where(eq(people.slug, candidate)).limit(1);
    if (!found) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function addPerson(fd: FormData, coupleId: string, slot: 1 | 2, theme: ThemeKey, displayName: string, passcode: string) {
  const db = await getDb();
  const slug = await uniqueSlug(db, displayName);
  const passwordHash = await bcrypt.hash(passcode, 12);
  const topics = chosenTopics(fd);

  return db.transaction(async (tx) => {
    const [person] = await tx
      .insert(people)
      .values({
        slug,
        displayName,
        theme,
        passwordHash,
        journalTitle: "Learning Journal",
        radarTitle: "Curiosity Radar",
        features: [],
      })
      .returning();
    await tx.insert(coupleMembers).values({ relationshipId: coupleId, personId: person.id, slot });
    if (topics.length) {
      await tx.insert(interests).values(topics.map((topic, position) => ({ personId: person.id, topic, position })));
    }
    await tx.insert(preferences).values({ personId: person.id });
    await tx.insert(profiles).values({ personId: person.id, onboardingCompletedAt: new Date() });
    return person;
  });
}

export async function startWorld(_: ActionState, fd: FormData): Promise<ActionState> {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(people);
  if (Number(n) > 0) return { error: "This world is already set up. Sign in instead." };

  const world = z.object({
    relationshipName: reqText(60),
    startedOn: isoDate.optional(),
  });
  const parsedPerson = personInput.safeParse(formObject(fd));
  const parsedWorld = world.safeParse(formObject(fd));
  if (!parsedPerson.success) return { error: parsedPerson.error.issues[0]?.message ?? "Check your details" };
  if (!parsedWorld.success) return { error: parsedWorld.error.issues[0]?.message ?? "Check your world details" };
  if (parsedPerson.data.passcode !== parsedPerson.data.confirm) return { error: "The passcodes do not match" };
  if (!chosenTopics(fd).length) return { error: "Pick at least one interest" };

  const [couple] = await db
    .insert(couples)
    .values({ name: parsedWorld.data.relationshipName, startedOn: parsedWorld.data.startedOn ?? null })
    .returning();
  const person = await addPerson(fd, couple.id, 1, parsedPerson.data.theme, parsedPerson.data.displayName, parsedPerson.data.passcode);

  await createSession({ personId: person.id, slug: person.slug });
  revalidatePath("/", "layout");
  redirect("/settings#invite");
}

export async function joinWorld(_: ActionState, fd: FormData): Promise<ActionState> {
  if (await getCtx()) return { error: "You are already signed in." };
  const invite = readInvite(String(fd.get("token") ?? ""));
  if (!invite) return { error: "This invitation is invalid or has expired. Ask your partner for a new link." };

  const parsedPerson = personInput.safeParse(formObject(fd));
  if (!parsedPerson.success) return { error: parsedPerson.error.issues[0]?.message ?? "Check your details" };
  if (parsedPerson.data.passcode !== parsedPerson.data.confirm) return { error: "The passcodes do not match" };
  if (!chosenTopics(fd).length) return { error: "Pick at least one interest" };

  const db = await getDb();
  const [couple] = await db.select().from(couples).where(eq(couples.id, invite.relationshipId)).limit(1);
  if (!couple) return { error: "This world no longer exists." };
  const [{ n }] = await db
    .select({ n: count() })
    .from(coupleMembers)
    .where(and(eq(coupleMembers.relationshipId, couple.id), eq(coupleMembers.status, "active")));
  if (Number(n) >= 2) return { error: "This invitation has already been used." };

  let person;
  try {
    person = await addPerson(fd, couple.id, Number(n) === 0 ? 1 : 2, parsedPerson.data.theme, parsedPerson.data.displayName, parsedPerson.data.passcode);
  } catch (e) {
    const code = (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") return { error: "This invitation has already been used." };
    throw e;
  }
  await createSession({ personId: person.id, slug: person.slug });
  revalidatePath("/", "layout");
  redirect("/");
}
