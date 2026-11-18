import { describe, expect, it } from "vitest";
import { roundToIeltsBand } from "./grading.service";

describe("roundToIeltsBand", () => {
  it("keeps whole and half bands unchanged", () => {
    expect(roundToIeltsBand(6.0)).toBe(6);
    expect(roundToIeltsBand(6.5)).toBe(6.5);
  });

  it("rounds .25 up to the next half band", () => {
    expect(roundToIeltsBand(6.25)).toBe(6.5);
  });

  it("rounds .75 up to the next whole band", () => {
    expect(roundToIeltsBand(6.75)).toBe(7);
  });

  it("matches the official average-of-4-criteria examples", () => {
    // (6 + 6 + 7 + 6) / 4 = 6.25 -> 6.5
    expect(roundToIeltsBand((6 + 6 + 7 + 6) / 4)).toBe(6.5);
    // (7 + 7 + 7 + 8) / 4 = 7.25 -> 7.5
    expect(roundToIeltsBand((7 + 7 + 7 + 8) / 4)).toBe(7.5);
  });
});
