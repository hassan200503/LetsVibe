import "server-only";
import { getDb } from "@/lib/db/client";
import {
  applyEntitlementOverride,
  checkRoom,
  checkStorage,
  ensureEntitlement,
  limitsOf,
  recordAiUsage,
  reserveAiQuestion,
  usageSummary,
  type EntitlementOverride,
} from "./core";
import type { AiUsage, LimitCheck, UsageSummary } from "./types";

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

export async function recordAi(coupleId: string, sourceId: string, usage: AiUsage): Promise<void> {
  return recordAiUsage(await getDb(), coupleId, sourceId, usage);
}

export async function currentLimits(coupleId: string) {
  const db = await getDb();
  return limitsOf(await ensureEntitlement(db, coupleId));
}

export async function overrideEntitlement(input: EntitlementOverride) {
  return applyEntitlementOverride(await getDb(), input);
}
