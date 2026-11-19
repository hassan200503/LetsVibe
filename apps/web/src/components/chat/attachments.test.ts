import { describe, expect, it } from "vitest";
import { downsamplePeaks } from "./attachments";

const sound = (n: number) => Array.from({ length: n }, (_, i) => (i + 1) / n);

describe("downsamplePeaks", () => {
  it("returns nothing for a recording with no samples", () => {
    expect(downsamplePeaks([])).toEqual([]);
  });

  it("always produces 48 bars for a long recording", () => {
    expect(downsamplePeaks(sound(480))).toHaveLength(48);
    expect(downsamplePeaks(sound(9_000))).toHaveLength(48);
  });

  it("averages each bucket and scales the loudest bar to full height", () => {
    const bars = downsamplePeaks([0, 0, 1, 1], 2);
    expect(bars).toHaveLength(2);
    expect(bars[0]).toBeCloseTo(0.06);
    expect(bars[1]).toBeCloseTo(1);
  });

  it("keeps every bar visible even in a silent stretch", () => {
    const bars = downsamplePeaks(new Array(96).fill(0));
    expect(bars).toHaveLength(48);
    expect(bars.every((v) => v === 0.06)).toBe(true);
  });

  it("never exceeds full height or dips below the visible floor", () => {
    for (const bars of [downsamplePeaks(sound(10)), downsamplePeaks(sound(48)), downsamplePeaks(sound(5000), 24)]) {
      expect(bars.every((v) => v >= 0.06 && v <= 1)).toBe(true);
      expect(Math.max(...bars)).toBeCloseTo(1);
    }
  });

  it("still returns the requested number of bars when samples are fewer than bars", () => {
    const bars = downsamplePeaks([0.2, 0.8, 0.4], 48);
    expect(bars).toHaveLength(48);
    expect(bars.every((v) => v >= 0.06 && v <= 1)).toBe(true);
  });
});
