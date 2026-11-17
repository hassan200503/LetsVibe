import type { Plan } from "@/lib/db/schema";

export type { Plan };

export type PlanLimits = {
  storageBytes: number;
  aiQuestionsPerMonth: number;
  rooms: number;
  exportsPerMonth: number;
};

export type Usage = {
  storageBytes: number;
  aiQuestions: number;
  rooms: number;
  exports: number;
};

export type UsageSummary = {
  plan: Plan;
  limits: PlanLimits;
  usage: Usage;
  /** Start of next UTC month, ISO string. All monthly counters reset here. */
  resetsAt: string;
};

export type LimitCheck =
  | { ok: true; used: number; limit: number; remaining: number }
  | { ok: false; used: number; limit: number; remaining: number; error: string };
