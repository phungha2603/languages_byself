import type { SrsCard, SrsRating, SrsReviewLogEntry, SrsReviewResult } from "@app/shared-types";
import { DEFAULT_REQUEST_RETENTION, DEFAULT_WEIGHTS } from "./constants.js";
import {
  RATING_TO_GRADE,
  initialDifficulty,
  initialStability,
  nextDifficulty,
  nextIntervalDays,
  retrievability,
  stabilityAfterLapse,
  stabilityAfterSuccess,
} from "./fsrs.js";

export interface FsrsSchedulerOptions {
  weights?: readonly number[];
  requestRetention?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function createNewCard(userId: string, vocabId: string, now: Date = new Date()): SrsCard {
  return {
    id: `${userId}:${vocabId}`,
    userId,
    vocabId,
    due: now.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: "new",
  };
}

/**
 * Stateless FSRS-4.5 scheduler. Call `review` each time a user grades a
 * flashcard; it returns the updated card plus a log entry for analytics
 * and for the orchestrator's weakness/retention calculations.
 */
export class FsrsScheduler {
  private readonly weights: readonly number[];
  private readonly requestRetention: number;

  constructor(options: FsrsSchedulerOptions = {}) {
    this.weights = options.weights ?? DEFAULT_WEIGHTS;
    this.requestRetention = options.requestRetention ?? DEFAULT_REQUEST_RETENTION;
  }

  review(card: SrsCard, rating: SrsRating, now: Date = new Date()): SrsReviewResult {
    const grade = RATING_TO_GRADE[rating];
    const difficultyBefore = card.difficulty;
    const stabilityBefore = card.stability;

    if (card.state === "new") {
      const difficulty = initialDifficulty(this.weights, grade);
      const stability = initialStability(this.weights, grade);
      const scheduledDays = nextIntervalDays(stability, this.requestRetention);
      const due = new Date(now.getTime() + scheduledDays * MS_PER_DAY);

      const updated: SrsCard = {
        ...card,
        difficulty,
        stability,
        elapsedDays: 0,
        scheduledDays,
        reps: card.reps + 1,
        lapses: grade === 1 ? card.lapses + 1 : card.lapses,
        state: grade === 4 ? "review" : grade === 1 ? "relearning" : "learning",
        due: due.toISOString(),
        lastReview: now.toISOString(),
      };

      const log: SrsReviewLogEntry = {
        cardId: card.id,
        reviewedAt: now.toISOString(),
        rating,
        elapsedDays: 0,
        scheduledDays,
        stabilityBefore,
        stabilityAfter: stability,
        difficultyBefore,
        difficultyAfter: difficulty,
      };

      return { card: updated, log };
    }

    const lastReview = card.lastReview ? new Date(card.lastReview) : now;
    const elapsedDays = Math.max(0, (now.getTime() - lastReview.getTime()) / MS_PER_DAY);
    const recall = retrievability(elapsedDays, card.stability);
    const difficulty = nextDifficulty(this.weights, card.difficulty, grade);

    const stability =
      grade === 1
        ? stabilityAfterLapse(this.weights, difficulty, card.stability, recall)
        : stabilityAfterSuccess(this.weights, difficulty, card.stability, recall, grade);

    const scheduledDays = nextIntervalDays(stability, this.requestRetention);
    const due = new Date(now.getTime() + scheduledDays * MS_PER_DAY);

    const updated: SrsCard = {
      ...card,
      difficulty,
      stability,
      elapsedDays,
      scheduledDays,
      reps: card.reps + 1,
      lapses: grade === 1 ? card.lapses + 1 : card.lapses,
      state: grade === 1 ? "relearning" : "review",
      due: due.toISOString(),
      lastReview: now.toISOString(),
    };

    const log: SrsReviewLogEntry = {
      cardId: card.id,
      reviewedAt: now.toISOString(),
      rating,
      elapsedDays,
      scheduledDays,
      stabilityBefore,
      stabilityAfter: stability,
      difficultyBefore,
      difficultyAfter: difficulty,
    };

    return { card: updated, log };
  }

  /** Current probability of recall for a card, as of `now`. */
  currentRetrievability(card: SrsCard, now: Date = new Date()): number {
    if (card.state === "new" || !card.lastReview) return 1;
    const elapsedDays = Math.max(0, (now.getTime() - new Date(card.lastReview).getTime()) / MS_PER_DAY);
    return retrievability(elapsedDays, card.stability);
  }
}
