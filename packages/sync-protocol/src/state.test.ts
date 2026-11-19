import { describe, expect, it } from "vitest";
import { applyEvent, expectedPositionMs, hasEnded, isStale } from "./state";
import { planCorrection } from "./correction";
import { IDLE_SNAPSHOT, type SyncEvent } from "./types";

const event = (seq: number, patch: Partial<SyncEvent> = {}): SyncEvent => ({
  seq,
  authorId: "alex",
  positionMs: 0,
  serverTimeMs: 1_000_000,
  playing: false,
  rate: 1,
  sourceKey: "youtube:abc",
  type: "pause",
  ...patch,
});

describe("room state", () => {
  it("advances while playing and freezes while paused", () => {
    const playing = { ...IDLE_SNAPSHOT, positionMs: 10_000, serverTimeMs: 1_000_000, playing: true, sourceKey: "x" };
    expect(expectedPositionMs(playing, 1_001_000)).toBe(11_000);
    expect(expectedPositionMs({ ...playing, rate: 1.5 }, 1_001_000)).toBe(11_500);
    expect(expectedPositionMs({ ...playing, playing: false }, 1_010_000)).toBe(10_000);
    expect(expectedPositionMs({ ...playing, positionMs: -50 }, 1_000_000)).toBe(0);
  });

  it("is last-writer-wins and idempotent by sequence number", () => {
    const first = applyEvent(IDLE_SNAPSHOT, event(1, { playing: true, positionMs: 4_000 }));
    expect(first.seq).toBe(1);
    expect(first.playing).toBe(true);

    // A late duplicate of seq 1 changes nothing.
    expect(applyEvent(first, event(1, { playing: false }))).toBe(first);
    // An older event from a slow network changes nothing either.
    expect(applyEvent(first, event(0, { playing: false }))).toBe(first);
    // A newer event wins.
    const second = applyEvent(first, event(2, { playing: false, positionMs: 9_000, type: "pause" }));
    expect(second.playing).toBe(false);
    expect(second.positionMs).toBe(9_000);
  });

  it("treats a zero or negative rate as normal speed and clamps a negative position", () => {
    const next = applyEvent(IDLE_SNAPSHOT, event(1, { positionMs: -100, rate: 0 }));
    expect(next.positionMs).toBe(0);
    expect(next.rate).toBe(1);
  });

  it("knows when the room is stale or the track has ended", () => {
    const state = { ...IDLE_SNAPSHOT, seq: 3, positionMs: 0, serverTimeMs: 10_000, playing: true, sourceKey: "x" };
    expect(isStale(state, 20_000)).toBe(false);
    expect(isStale(state, 90_000)).toBe(true);
    expect(isStale(IDLE_SNAPSHOT, 999_999)).toBe(false);
    expect(hasEnded({ ...state, positionMs: 59_000 }, 11_000, 60_000)).toBe(true);
    expect(hasEnded({ ...state, positionMs: 0 }, 11_000, 60_000)).toBe(false);
    expect(hasEnded({ ...state, playing: false, positionMs: 59_990 }, 11_000, 60_000)).toBe(false);
  });
});

describe("drift correction", () => {
  it("leaves gaps below 150 ms alone", () => {
    expect(planCorrection(149).kind).toBe("hold");
    expect(planCorrection(-149).kind).toBe("hold");
    expect(planCorrection(0).rate).toBe(1);
  });

  it("nudges rate within 5% for ordinary gaps, slower when ahead and faster when behind", () => {
    const ahead = planCorrection(600);
    expect(ahead.kind).toBe("nudge");
    expect(ahead.rate).toBeCloseTo(0.95, 5);
    const behind = planCorrection(-600);
    expect(behind.rate).toBeCloseTo(1.05, 5);
    expect(planCorrection(10_000).kind).toBe("seek");
  });

  it("seeks at a second for players that cannot change rate", () => {
    expect(planCorrection(400, { canRate: false }).kind).toBe("seek");
    expect(planCorrection(400, { canRate: true }).kind).toBe("nudge");
  });

  it("allows a larger nudge while catching up after a stall", () => {
    const normal = planCorrection(900);
    const catchingUp = planCorrection(900, { catchingUp: true });
    expect(Math.abs(1 - normal.rate)).toBeCloseTo(0.05, 5);
    expect(Math.abs(1 - catchingUp.rate)).toBeCloseTo(0.09, 5);
  });
});
