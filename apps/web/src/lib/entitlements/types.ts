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
  aiTokens: number;
  /** Estimated USD spend on the couple's own key this month, in millionths. */
  aiCostMicros: number;
  rooms: number;
  exports: number;
};

/** What one model call produced, read from Gemini's usage metadata. */
export type AiUsage = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
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
