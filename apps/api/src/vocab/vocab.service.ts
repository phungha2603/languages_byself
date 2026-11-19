import { Injectable } from "@nestjs/common";
import { CEFR_LEVEL_BY_STAGE, VOCAB_UNLOCK_THRESHOLD, type CefrLevel, type VocabLevelProgress, type VocabTopicGroup } from "@app/shared-types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VocabService {
  constructor(private readonly prisma: PrismaService) {}

  /** The curated word bank for one IELTS stage (== one CEFR level), alphabetical. */
  async listByStage(stageId: string) {
    return this.prisma.vocabItem.findMany({
      where: { stageIds: { array_contains: stageId } },
      orderBy: { headword: "asc" },
    });
  }

  /** The vocabId set a user has reviewed at least once (FSRS reps >= 1) — our definition of "mastered enough to count". */
  private async masteredVocabIds(userId: string): Promise<Set<string>> {
    const cards = await this.prisma.srsCard.findMany({
      where: { userId, reps: { gte: 1 } },
      select: { vocabId: true },
    });
    return new Set(cards.map((c) => c.vocabId));
  }

  /** One stage's word bank grouped into topic decks, with per-topic mastery counts for `userId` (if given). */
  async listTopicsByStage(stageId: string, userId?: string): Promise<VocabTopicGroup[]> {
    const words = await this.listByStage(stageId);
    const mastered = userId ? await this.masteredVocabIds(userId) : new Set<string>();

    const byTopic = new Map<string, typeof words>();
    for (const word of words) {
      const key = word.topic ?? "General";
      if (!byTopic.has(key)) byTopic.set(key, []);
      byTopic.get(key)!.push(word);
    }

    return Array.from(byTopic.entries()).map(([topic, topicWords]) => ({
      topic,
      totalWords: topicWords.length,
      masteredWords: topicWords.filter((w) => mastered.has(w.id)).length,
      words: topicWords as VocabTopicGroup["words"],
    }));
  }

  /**
   * Per-stage vocabulary mastery, in roadmap order, with sequential unlock gating: stage 0 is
   * always unlocked, and stage N unlocks only once stage N-1's mastery crosses the threshold.
   * This is the vocab tab's own progression — separate from (but conceptually mirroring) the
   * main IELTS stage gate, since a user can be "in progress" on the overall roadmap while still
   * working through an earlier stage's word list.
   */
  async getLevelProgress(userId: string): Promise<VocabLevelProgress[]> {
    const stages = await this.prisma.ieltsStage.findMany({ orderBy: { order: "asc" } });
    const mastered = await this.masteredVocabIds(userId);

    const result: VocabLevelProgress[] = [];
    let previousMet = true; // stage 0 is always unlocked
    for (const stage of stages) {
      const words = await this.listByStage(stage.id);
      const masteredWords = words.filter((w) => mastered.has(w.id)).length;
      const masteryPercent = words.length === 0 ? 0 : Math.round((masteredWords / words.length) * 100);
      const met = masteryPercent >= VOCAB_UNLOCK_THRESHOLD;

      result.push({
        stageId: stage.id,
        cefrLevel: (CEFR_LEVEL_BY_STAGE[stage.id] ?? "A1") as CefrLevel,
        stageLabel: stage.label,
        totalWords: words.length,
        masteredWords,
        masteryPercent,
        status: !previousMet ? "locked" : met ? "completed" : "unlocked",
      });

      previousMet = previousMet && met;
    }
    return result;
  }

  /**
   * Every word, across every stage up to and including `uptoStageId`, that the user has already
   * studied at least once — shuffled for a cumulative "test your older words" review session.
   */
  async listReviewableWords(userId: string, uptoStageId: string) {
    const stages = await this.prisma.ieltsStage.findMany({ orderBy: { order: "asc" } });
    const uptoStage = stages.find((s) => s.id === uptoStageId);
    const eligibleStageIds = (uptoStage ? stages.filter((s) => s.order <= uptoStage.order) : stages).map((s) => s.id);

    const mastered = await this.masteredVocabIds(userId);
    const words = await this.prisma.vocabItem.findMany({
      where: { OR: eligibleStageIds.map((id) => ({ stageIds: { array_contains: id } })) },
    });
    const reviewable = words.filter((w) => mastered.has(w.id));

    // Fisher-Yates shuffle so repeat sessions don't always open with the same word.
    for (let i = reviewable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = reviewable[i]!;
      reviewable[i] = reviewable[j]!;
      reviewable[j] = tmp;
    }
    return reviewable;
  }
}
