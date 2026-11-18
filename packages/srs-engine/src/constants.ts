/**
 * FSRS-4.5 default parameters, as published by the open-spaced-repetition
 * project (github.com/open-spaced-repetition/awesome-fsrs). w[0..3] are the
 * initial-stability weights for ratings Again/Hard/Good/Easy; w[4..16] drive
 * difficulty and the stability-update formulas below.
 */
export const DEFAULT_WEIGHTS: readonly number[] = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];

/** Power-curve forgetting-curve constants: R(t,S) = (1 + FACTOR * t/S) ^ DECAY. */
export const DECAY = -0.5;
export const FACTOR = 19 / 81;

/** Target probability of recall the scheduler optimizes intervals for. */
export const DEFAULT_REQUEST_RETENTION = 0.9;

export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;
export const MIN_STABILITY = 0.1;
