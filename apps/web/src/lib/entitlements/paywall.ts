import { formatBytes } from "./format";
import type { PlanLimits } from "./types";

export type BenefitRow = {
  key: "storage" | "ai" | "rooms" | "exports";
  label: string;
  current: string;
  target: string;
  grows: boolean;
};

function amount(value: number, kind: "bytes" | "count"): string {
  if (value <= 0) return "Not included";
  return kind === "bytes" ? formatBytes(value) : String(value);
}

/**
 * The paywall reads whatever limits the couple's entitlement holds, so a
 * support override is reflected instead of a marketing number. No price is
 * part of this shape: pricing is a human decision (H23).
 */
export function comparePlans(current: PlanLimits, target: PlanLimits): BenefitRow[] {
  return [
    { key: "storage", label: "Shared storage", current: amount(current.storageBytes, "bytes"), target: amount(target.storageBytes, "bytes"), grows: target.storageBytes > current.storageBytes },
    {
      key: "ai",
      label: "AI questions each month",
      current: amount(current.aiQuestionsPerMonth, "count"),
      target: amount(target.aiQuestionsPerMonth, "count"),
      grows: target.aiQuestionsPerMonth > current.aiQuestionsPerMonth,
    },
    { key: "rooms", label: "Together rooms", current: amount(current.rooms, "count"), target: amount(target.rooms, "count"), grows: target.rooms > current.rooms },
    {
      key: "exports",
      label: "Data exports each month",
      current: amount(current.exportsPerMonth, "count"),
      target: amount(target.exportsPerMonth, "count"),
      grows: target.exportsPerMonth > current.exportsPerMonth,
    },
  ];
}
