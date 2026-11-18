import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { coupleMembers, profiles } from "@/lib/db/schema";
import { dayInZone } from "./day";

/**
 * The day both partners see. Couples have no zone of their own, so the shared
 * day follows the first active member's profile zone — it is the same value on
 * both phones, which is the only thing that matters for a shared streak.
 */
export async function coupleDay(coupleId: string, now: Date): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .select({ timezone: profiles.timezone })
    .from(coupleMembers)
    .innerJoin(profiles, eq(profiles.personId, coupleMembers.personId))
    .where(and(eq(coupleMembers.coupleId, coupleId), eq(coupleMembers.status, "active")))
    .orderBy(asc(coupleMembers.slot))
    .limit(1);
  return dayInZone(now, row?.timezone ?? "UTC");
}
