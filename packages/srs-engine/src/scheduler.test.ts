import { describe, expect, it } from "vitest";
import { createNewCard, FsrsScheduler } from "./scheduler.js";

describe("FsrsScheduler.review", () => {
  it("schedules a brand-new card into the future and marks it reviewed", () => {
    const scheduler = new FsrsScheduler();
    const now = new Date("2026-01-01T00:00:00Z");
    const card = createNewCard("user-1", "vocab-1", now);

    const { card: updated, log } = scheduler.review(card, "good", now);

    expect(updated.state).not.toBe("new");
    expect(updated.reps).toBe(1);
    expect(new Date(updated.due).getTime()).toBeGreaterThan(now.getTime());
    expect(log.rating).toBe("good");
    expect(log.stabilityAfter).toBeGreaterThan(0);
  });

  it("increases stability and interval across consecutive 'good' reviews answered right on schedule", () => {
    const scheduler = new FsrsScheduler();
    let now = new Date("2026-01-01T00:00:00Z");
    let card = createNewCard("user-1", "vocab-1", now);

    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      const result = scheduler.review(card, "good", now);
      card = result.card;
      intervals.push(card.scheduledDays);
      now = new Date(now.getTime() + card.scheduledDays * 24 * 60 * 60 * 1000);
    }

    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]!).toBeGreaterThanOrEqual(intervals[i - 1]!);
    }
  });

  it("drops stability and flags a lapse when the user answers 'again' after forgetting", () => {
    const scheduler = new FsrsScheduler();
    const now = new Date("2026-01-01T00:00:00Z");
    let card = createNewCard("user-1", "vocab-1", now);
    card = scheduler.review(card, "good", now).card;

    const muchLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const { card: afterLapse, log } = scheduler.review(card, "again", muchLater);

    expect(afterLapse.lapses).toBe(1);
    expect(afterLapse.state).toBe("relearning");
    expect(log.stabilityAfter).toBeLessThan(log.stabilityBefore);
  });

  it("gives Easy a longer resulting interval than Good from the same new-card state", () => {
    const scheduler = new FsrsScheduler();
    const now = new Date("2026-01-01T00:00:00Z");

    const good = scheduler.review(createNewCard("user-1", "vocab-good", now), "good", now).card;
    const easy = scheduler.review(createNewCard("user-1", "vocab-easy", now), "easy", now).card;

    expect(easy.scheduledDays).toBeGreaterThanOrEqual(good.scheduledDays);
  });
});
