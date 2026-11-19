/**
 * How a client closes the gap to the shared playhead.
 *
 * Small differences are not worth hearing: below ~150 ms a correction would
 * disturb more than it fixes. Between 150 ms and a second the player is nudged
 * a few percent faster or slower (pitch preserved by the browser), which is
 * inaudible and closes the gap over a few seconds. Beyond a second there is no
 * honest alternative to a seek. A player that cannot change rate (YouTube's
 * IFrame API) seeks as soon as the soft threshold is crossed.
 */
export type CorrectionConfig = {
  /** Below this, leave the player alone. */
  softMs: number;
  /** At or above this, a seek is the only reliable fix. */
  hardMs: number;
  /** Largest rate change for an ordinary gap (5%). */
  maxNudge: number;
  /** Largest rate change while catching up after a stall (10%). */
  catchUpNudge: number;
  /** Rate change per millisecond of drift. */
  gain: number;
};

export const DEFAULT_CORRECTION: CorrectionConfig = {
  softMs: 150,
  hardMs: 1000,
  maxNudge: 0.05,
  catchUpNudge: 0.1,
  gain: 0.0001,
};

export type Correction = {
  kind: "hold" | "nudge" | "seek";
  /** Positive means the local player is ahead of the room. */
  driftMs: number;
  /** Requested local playback rate; always 1 for hold and seek. */
  rate: number;
};

export type CorrectionOptions = Partial<Omit<CorrectionConfig, "gain">> & {
  gain?: number;
  /** False for players that cannot change rate, such as YouTube. */
  canRate?: boolean;
  /** True while recovering from a stall: allows the larger catch-up nudge. */
  catchingUp?: boolean;
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

export function planCorrection(driftMs: number, options: CorrectionOptions = {}): Correction {
  const cfg = { ...DEFAULT_CORRECTION, ...options };
  const abs = Math.abs(driftMs);
  if (abs < cfg.softMs) return { kind: "hold", driftMs, rate: 1 };
  if (!(options.canRate ?? true) || abs >= cfg.hardMs) return { kind: "seek", driftMs, rate: 1 };
  const cap = options.catchingUp ? cfg.catchUpNudge : cfg.maxNudge;
  const rate = 1 - clamp(driftMs * cfg.gain, -cap, cap);
  return { kind: "nudge", driftMs, rate };
}

/**
 * A client should not broadcast a heartbeat more often than this. The room
 * state is durable; heartbeats exist only to recover from a missed broadcast.
 */
export const MIN_HEARTBEAT_MS = 5_000;

export function heartbeatDue(lastSentAtMs: number, nowMs: number, minimumMs = MIN_HEARTBEAT_MS): boolean {
  return nowMs - lastSentAtMs >= minimumMs;
}
