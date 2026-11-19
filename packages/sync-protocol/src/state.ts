import type { PlaybackSnapshot, SyncEvent } from "./types";

/**
 * Where the playhead should be, in milliseconds, at a given server time.
 *
 * While paused this is simply the stored position. While playing it advances at
 * the state's rate, which is what lets a client that joined late — or simply
 * missed a broadcast — compute the right position from one snapshot.
 */
export function expectedPositionMs(state: PlaybackSnapshot, nowServerMs: number): number {
  if (!state.playing) return Math.max(0, state.positionMs);
  const rate = state.rate > 0 ? state.rate : 1;
  return Math.max(0, state.positionMs + (nowServerMs - state.serverTimeMs) * rate);
}

/**
 * Last-writer-wins by `seq`. An event at or below the current sequence is a
 * duplicate or a straggler and returns the same snapshot untouched, so callers
 * can compare identity to detect a no-op.
 */
export function applyEvent(state: PlaybackSnapshot, event: SyncEvent): PlaybackSnapshot {
  if (event.seq <= state.seq) return state;
  return {
    seq: event.seq,
    authorId: event.authorId,
    positionMs: Math.max(0, event.positionMs),
    serverTimeMs: event.serverTimeMs,
    playing: event.playing,
    rate: event.rate > 0 ? event.rate : 1,
    sourceKey: event.sourceKey,
  };
}

/** True when the room has not been written to for longer than a client should trust. */
export function isStale(state: PlaybackSnapshot, nowServerMs: number, limitMs = 60_000): boolean {
  return state.seq > 0 && nowServerMs - state.serverTimeMs > limitMs;
}

/** Whether a track has reached its end according to the shared clock. */
export function hasEnded(state: PlaybackSnapshot, nowServerMs: number, durationMs: number): boolean {
  if (!state.playing || durationMs <= 0) return false;
  return expectedPositionMs(state, nowServerMs) >= durationMs - 250;
}
