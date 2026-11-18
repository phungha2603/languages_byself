import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS } from "./constants.js";
import { initialDifficulty, initialStability, nextIntervalDays, retrievability } from "./fsrs.js";

describe("initialStability", () => {
  it("maps grade 1-4 to w0-w3", () => {
    expect(initialStability(DEFAULT_WEIGHTS, 1)).toBeCloseTo(DEFAULT_WEIGHTS[0]!);
    expect(initialStability(DEFAULT_WEIGHTS, 4)).toBeCloseTo(DEFAULT_WEIGHTS[3]!);
  });

  it("is monotonically increasing from Again to Easy", () => {
    const s = [1, 2, 3, 4].map((g) => initialStability(DEFAULT_WEIGHTS, g as 1 | 2 | 3 | 4));
    expect(s[0]! < s[1]! && s[1]! < s[2]! && s[2]! < s[3]!).toBe(true);
  });
});

describe("initialDifficulty", () => {
  it("clamps to [1, 10]", () => {
    for (const g of [1, 2, 3, 4] as const) {
      const d = initialDifficulty(DEFAULT_WEIGHTS, g);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });

  it("is higher after Again than after Easy", () => {
    const dAgain = initialDifficulty(DEFAULT_WEIGHTS, 1);
    const dEasy = initialDifficulty(DEFAULT_WEIGHTS, 4);
    expect(dAgain).toBeGreaterThan(dEasy);
  });
});

describe("retrievability", () => {
  it("is 1 at t=0 and decays toward 0 as t grows", () => {
    expect(retrievability(0, 10)).toBe(1);
    const r1 = retrievability(5, 10);
    const r2 = retrievability(50, 10);
    expect(r1).toBeGreaterThan(r2);
    expect(r2).toBeGreaterThan(0);
  });

  it("~0.9 when t equals S (by construction of FACTOR/DECAY)", () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 2);
  });

  it("higher stability means slower decay at a fixed elapsed time", () => {
    const low = retrievability(30, 10);
    const high = retrievability(30, 100);
    expect(high).toBeGreaterThan(low);
  });
});

describe("nextIntervalDays", () => {
  it("round-trips with retrievability: scheduling at S then checking R at that interval ~= requestRetention", () => {
    const stability = 20;
    const days = nextIntervalDays(stability, 0.9);
    expect(retrievability(days, stability)).toBeCloseTo(0.9, 1);
  });

  it("grows with stability", () => {
    const short = nextIntervalDays(5, 0.9);
    const long = nextIntervalDays(50, 0.9);
    expect(long).toBeGreaterThan(short);
  });

  it("never returns less than 1 day", () => {
    expect(nextIntervalDays(0.01, 0.9)).toBeGreaterThanOrEqual(1);
  });
});
