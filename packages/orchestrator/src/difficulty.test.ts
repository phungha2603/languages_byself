import { describe, expect, it } from "vitest";
import { adjustDifficulty } from "./difficulty.js";

describe("adjustDifficulty", () => {
  it("raises difficulty when accuracy is comfortably high", () => {
    const result = adjustDifficulty("reading", 5, 90);
    expect(result.newDifficulty).toBeGreaterThan(5);
  });

  it("lowers difficulty when accuracy is low", () => {
    const result = adjustDifficulty("listening", 5, 40);
    expect(result.newDifficulty).toBeLessThan(5);
  });

  it("holds steady inside the target band", () => {
    const result = adjustDifficulty("speaking", 5, 72);
    expect(result.newDifficulty).toBe(5);
  });

  it("never exceeds the max difficulty", () => {
    const result = adjustDifficulty("writing", 10, 95);
    expect(result.newDifficulty).toBeLessThanOrEqual(10);
  });

  it("never drops below the min difficulty", () => {
    const result = adjustDifficulty("writing", 1, 10);
    expect(result.newDifficulty).toBeGreaterThanOrEqual(1);
  });
});
