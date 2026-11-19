import { describe, expect, it } from "vitest";
import { NETWORK_PROFILES, simulateRoom } from "./simulator";

/**
 * These are measured, not asserted from hope: the numbers below are the output
 * of the deterministic simulator on 2026-11-19. If a change to the protocol
 * makes drift worse, the threshold fails here before it reaches a phone.
 */
describe("room simulator", () => {
  it("keeps steady-state drift under 500 ms p95 on wifi and mobile", () => {
    for (const name of ["wifi", "mobile"] as const) {
      const result = simulateRoom(NETWORK_PROFILES[name], { seed: 7 });
      expect(result.samples, name).toBeGreaterThan(200);
      expect(result.p95Ms, name).toBeLessThan(500);
      expect(result.maxMs, name).toBeLessThan(1_500);
      // A 650 ms stall is corrected in the soft range; a 2.5 s stall and an
      // explicit seek each need a jump.
      expect(result.nudges, name).toBeGreaterThan(0);
      expect(result.seeks, name).toBeGreaterThanOrEqual(3);
    }
  });

  it("holds the target on a bad line too", () => {
    const result = simulateRoom(NETWORK_PROFILES.poor, { seed: 7 });
    expect(result.p95Ms).toBeLessThan(500);
    expect(result.maxMs).toBeLessThan(1_500);
    expect(result.samples).toBeGreaterThan(200);
  });

  it("recovers from a third of broadcasts being dropped, because polls still carry the truth", () => {
    const lossy = { ...NETWORK_PROFILES.mobile, loss: 0.33 };
    const result = simulateRoom(lossy, { seed: 11 });
    expect(result.missedBroadcasts).toBeGreaterThan(0);
    expect(result.p95Ms).toBeLessThan(800);
    expect(result.samples).toBeGreaterThan(200);
  });

  it("is deterministic: the same seed and profile give the same numbers", () => {
    const first = simulateRoom(NETWORK_PROFILES.mobile, { seed: 42 });
    const second = simulateRoom(NETWORK_PROFILES.mobile, { seed: 42 });
    expect(second).toEqual(first);
  });

  it("reports the seek spike separately from steady-state drift", () => {
    const result = simulateRoom(NETWORK_PROFILES.wifi, {
      seed: 3,
      commands: [
        { atMs: 3_000, from: "a", kind: "source", sourceKey: "youtube:fixture" },
        { atMs: 5_000, from: "a", kind: "play", positionMs: 0 },
        { atMs: 25_000, from: "a", kind: "seek", positionMs: 600_000 },
      ],
      stalls: [],
    });
    expect(result.worstMs).toBeGreaterThan(500_000);
    expect(result.p95Ms).toBeLessThan(500);
  });
});
