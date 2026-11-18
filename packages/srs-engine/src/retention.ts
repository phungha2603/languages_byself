import type { SrsCard, SrsRetentionStats } from "@app/shared-types";
import { FsrsScheduler } from "./scheduler.js";

/** Anki-style "mature" threshold: a card has survived at least one long interval. */
const MATURE_INTERVAL_DAYS = 21;

/**
 * Aggregate SRS health for a user within a stage, used by the orchestrator
 * to decide whether vocabulary retention clears a stage's exit criteria.
 */
export function computeRetentionStats(
  cards: readonly SrsCard[],
  userId: string,
  stageId: string,
  now: Date = new Date(),
  scheduler: FsrsScheduler = new FsrsScheduler(),
): SrsRetentionStats {
  const reviewedCards = cards.filter((c) => c.state !== "new");
  const matureCards = cards.filter((c) => c.scheduledDays >= MATURE_INTERVAL_DAYS);
  const dueNow = cards.filter((c) => c.state !== "new" && new Date(c.due).getTime() <= now.getTime());

  const retentionRate =
    reviewedCards.length === 0
      ? 0
      : (reviewedCards.reduce((sum, c) => sum + scheduler.currentRetrievability(c, now), 0) / reviewedCards.length) *
        100;

  return {
    userId,
    stageId,
    totalCards: cards.length,
    matureCards: matureCards.length,
    retentionRate: Math.round(retentionRate * 10) / 10,
    dueNow: dueNow.length,
  };
}
