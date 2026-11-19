/**
 * The wire format for a shared playback room.
 *
 * The server owns the state. Every event it emits is a complete snapshot of
 * that state rather than a patch, because a client that misses one event (a
 * phone losing signal for two seconds) must be able to continue from the next
 * one without having replayed the history. `seq` is strictly increasing and is
 * the only ordering authority: equal or older events are ignored, so deliveries
 * that arrive twice or out of order are harmless.
 */
export type SyncEventType = "source" | "play" | "pause" | "seek" | "rate" | "ended" | "snapshot";

export type PlaybackSnapshot = {
  /** Strictly increasing per room; the last-writer-wins key. */
  seq: number;
  /** The member whose action produced this state. */
  authorId: string;
  /** Playhead position, in milliseconds, at `serverTimeMs`. */
  positionMs: number;
  /** Server clock (epoch ms) when this state was written. */
  serverTimeMs: number;
  playing: boolean;
  /** User-chosen playback rate (1 = normal). Correction nudges are client-local. */
  rate: number;
  /** Identifies what is playing, e.g. `youtube:dQw4w9WgXcQ`. Null = nothing loaded. */
  sourceKey: string | null;
};

export type SyncEvent = PlaybackSnapshot & {
  /** Why the state changed. Content is carried by the snapshot itself. */
  type: SyncEventType;
};

export const IDLE_SNAPSHOT: PlaybackSnapshot = {
  seq: 0,
  authorId: "",
  positionMs: 0,
  serverTimeMs: 0,
  playing: false,
  rate: 1,
  sourceKey: null,
};

/** Seconds on a player clock, from a millisecond position. */
export const toSeconds = (positionMs: number): number => positionMs / 1000;
