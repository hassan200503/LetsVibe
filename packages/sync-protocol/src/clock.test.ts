import { describe, expect, it } from "vitest";
import { addSample, clockRtt, estimateClock, serverNow, type ClockSample } from "./clock";

const sample = (sent: number, received: number, server: number): ClockSample => ({ sentClientMs: sent, receivedClientMs: received, serverTimeMs: server });

describe("server clock estimation", () => {
  it("recovers a constant skew exactly when the network is symmetric and clean", () => {
    // Server is 37s ahead; every round trip takes 80ms.
    const samples = [1000, 2000, 3000].map((sent) => sample(sent, sent + 80, sent + 40 + 37_000));
    const estimate = estimateClock(samples);
    expect(estimate.offsetMs).toBe(37_000);
    expect(estimate.rttMs).toBe(80);
    expect(estimate.samples).toBe(3);
  });

  it("takes the least-delayed sample, so a queueing spike cannot drag the clock", () => {
    const clean = sample(10_000, 10_080, 10_040 + 5_000);
    const spike = sample(11_000, 11_900, 11_450 + 5_000);
    const estimate = estimateClock([spike, clean, spike]);
    expect(estimate.offsetMs).toBe(5_000);
    expect(estimate.rttMs).toBe(80);
  });

  it("keeps a recent window and ignores the oldest sample once it falls out", () => {
    let samples: ClockSample[] = [];
    for (let i = 0; i < 14; i += 1) samples = addSample(samples, sample(i * 1000, i * 1000 + 20 + i, i * 1000 + 10 + i), 12);
    expect(samples).toHaveLength(12);
    expect(samples[0].sentClientMs).toBe(2_000);
  });

  it("has no opinion before the first sample, and reports a sane RTT", () => {
    expect(estimateClock([])).toMatchObject({ offsetMs: 0, rttMs: Infinity, samples: 0 });
    expect(clockRtt(sample(0, 50, 25))).toBe(50);
    expect(clockRtt(sample(100, 90, 95))).toBe(0);
    expect(serverNow(1_000, -250)).toBe(750);
  });
});
