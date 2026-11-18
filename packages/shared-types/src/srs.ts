/** FSRS-style review grade the learner gives right after recalling a card. */
export const SRS_RATINGS = ["again", "hard", "good", "easy"] as const;
export type SrsRating = (typeof SRS_RATINGS)[number];

export const SRS_STATES = ["new", "learning", "review", "relearning"] as const;
export type SrsState = (typeof SRS_STATES)[number];

/** A single user's spaced-repetition record for one vocabulary item. */
export interface SrsCard {
  id: string;
  userId: string;
  vocabId: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: SrsState;
  lastReview?: string;
}

export interface SrsReviewLogEntry {
  cardId: string;
  reviewedAt: string;
  rating: SrsRating;
  elapsedDays: number;
  scheduledDays: number;
  stabilityBefore: number;
  stabilityAfter: number;
  difficultyBefore: number;
  difficultyAfter: number;
}

export interface SrsReviewResult {
  card: SrsCard;
  log: SrsReviewLogEntry;
}

/** Aggregate retention stats used by the orchestrator's band-gating logic. */
export interface SrsRetentionStats {
  userId: string;
  stageId: string;
  totalCards: number;
  matureCards: number;
  retentionRate: number;
  dueNow: number;
}
