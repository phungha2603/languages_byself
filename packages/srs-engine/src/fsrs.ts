import type { SrsRating } from "@app/shared-types";
import { DECAY, FACTOR, MAX_DIFFICULTY, MIN_DIFFICULTY, MIN_STABILITY } from "./constants.js";

/** FSRS grades are 1-indexed: Again=1, Hard=2, Good=3, Easy=4. */
export const RATING_TO_GRADE: Record<SrsRating, 1 | 2 | 3 | 4> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** S0(G) = w[G-1] */
export function initialStability(weights: readonly number[], grade: 1 | 2 | 3 | 4): number {
  return Math.max(MIN_STABILITY, weights[grade - 1] ?? MIN_STABILITY);
}

/** D0(G) = w4 - (G-3) * w5, clamped to [1,10]. */
export function initialDifficulty(weights: readonly number[], grade: 1 | 2 | 3 | 4): number {
  const w4 = weights[4] ?? 0;
  const w5 = weights[5] ?? 0;
  return clamp(w4 - (grade - 3) * w5, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

/**
 * D'(D,G) = w7 * D0(3) + (1 - w7) * (D - w6 * (G - 3)), clamped to [1,10].
 * The w7 term pulls difficulty back toward the "Good" baseline (mean reversion)
 * so a single easy/lucky review can't permanently flatten difficulty.
 */
export function nextDifficulty(weights: readonly number[], difficulty: number, grade: 1 | 2 | 3 | 4): number {
  const w6 = weights[6] ?? 0;
  const w7 = weights[7] ?? 0;
  const d0Good = initialDifficulty(weights, 3);
  const reverted = difficulty - w6 * (grade - 3);
  return clamp(w7 * d0Good + (1 - w7) * reverted, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

/** R(t,S) = (1 + FACTOR * t/S) ^ DECAY. Retrievability at elapsed time t given stability S. */
export function retrievability(elapsedDays: number, stability: number): number {
  if (elapsedDays <= 0) return 1;
  return Math.pow(1 + (FACTOR * elapsedDays) / Math.max(stability, MIN_STABILITY), DECAY);
}

/** I(r,S) = (S / FACTOR) * (r ^ (1/DECAY) - 1). Interval (days) that decays stability to target retrievability r. */
export function nextIntervalDays(stability: number, requestRetention: number): number {
  const days = (stability / FACTOR) * (Math.pow(requestRetention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(days));
}

/**
 * Stability after a successful review (Hard/Good/Easy):
 * S' = S * ( e^w8 * (11-D) * S^-w9 * (e^(w10*(1-R)) - 1) * hardPenalty * easyBonus + 1 )
 * w15 penalizes Hard (grade 2), w16 rewards Easy (grade 4); both are 1 for Good (grade 3).
 */
export function stabilityAfterSuccess(
  weights: readonly number[],
  difficulty: number,
  stability: number,
  recall: number,
  grade: 2 | 3 | 4,
): number {
  const w8 = weights[8] ?? 0;
  const w9 = weights[9] ?? 0;
  const w10 = weights[10] ?? 0;
  const w15 = weights[15] ?? 1;
  const w16 = weights[16] ?? 1;

  const hardPenalty = grade === 2 ? w15 : 1;
  const easyBonus = grade === 4 ? w16 : 1;

  const growth =
    Math.exp(w8) *
    (11 - difficulty) *
    Math.pow(Math.max(stability, MIN_STABILITY), -w9) *
    (Math.exp(w10 * (1 - recall)) - 1) *
    hardPenalty *
    easyBonus;

  return Math.max(MIN_STABILITY, stability * (growth + 1));
}

/**
 * Stability after forgetting (Again):
 * S' = w11 * D^-w12 * ((S+1)^w13 - 1) * e^(w14*(1-R))
 */
export function stabilityAfterLapse(
  weights: readonly number[],
  difficulty: number,
  stability: number,
  recall: number,
): number {
  const w11 = weights[11] ?? 0;
  const w12 = weights[12] ?? 0;
  const w13 = weights[13] ?? 0;
  const w14 = weights[14] ?? 0;

  const next =
    w11 *
    Math.pow(Math.max(difficulty, MIN_DIFFICULTY), -w12) *
    (Math.pow(stability + 1, w13) - 1) *
    Math.exp(w14 * (1 - recall));

  return Math.max(MIN_STABILITY, next);
}
