import "server-only";
import { getDb } from "@/lib/db/client";
import {
  applyEntitlementOverride,
  checkRoom,
  checkStorage,
  ensureEntitlement,
  limitsOf,
  reserveAiQuestion,
  usageSummary,
  type EntitlementOverride,
} from "./core";
import type { LimitCheck, UsageSummary } from "./types";

export async function planUsage(coupleId: string): Promise<UsageSummary> {
  return usageSummary(await getDb(), coupleId);
}

export async function storageAvailable(coupleId: string, addBytes: number): Promise<LimitCheck> {
  return checkStorage(await getDb(), coupleId, addBytes);
}

export async function roomAvailable(coupleId: string): Promise<LimitCheck> {
  return checkRoom(await getDb(), coupleId);
}

export async function reserveAi(coupleId: string, personId: string, sourceId: string): Promise<LimitCheck> {
  return reserveAiQuestion(await getDb(), coupleId, personId, sourceId);
}

export async function currentLimits(coupleId: string) {
  const db = await getDb();
  return limitsOf(await ensureEntitlement(db, coupleId));
}

export async function overrideEntitlement(input: EntitlementOverride) {
  return applyEntitlementOverride(await getDb(), input);
}
