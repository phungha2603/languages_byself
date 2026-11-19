import { Injectable } from "@nestjs/common";
import { resolveAnchorVocabLevel, VOCAB_UNLOCK_THRESHOLD, type VocabChapterGroup, type VocabLevelProgress } from "@app/shared-types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VocabService {
  constructor(private readonly prisma: PrismaService) {}

  /** The 4-level progression (B1 -> C2), in order. */
  async listLevels() {
    return this.prisma.vocabLevel.findMany({ orderBy: { order: "asc" } });
  }

  /** The curated word bank for one level, alphabetical. */
  async listByLevel(levelId: string) {
    return this.prisma.vocabItem.findMany({
      where: { vocabLevelId: levelId },
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

  /** One level's word bank grouped into chapter decks (easy -> hard), with per-chapter mastery counts for `userId` (if given). */
  async listChaptersByLevel(levelId: string, userId?: string): Promise<VocabChapterGroup[]> {
    const words = await this.prisma.vocabItem.findMany({
      where: { vocabLevelId: levelId },
      orderBy: [{ chapterOrder: "asc" }, { wordOrder: "asc" }],
    });
    const mastered = userId ? await this.masteredVocabIds(userId) : new Set<string>();

    const byChapter = new Map<string, { order: number; words: typeof words }>();
    for (const word of words) {
      const key = word.chapter ?? "General";
      if (!byChapter.has(key)) byChapter.set(key, { order: word.chapterOrder, words: [] });
      byChapter.get(key)!.words.push(word);
    }

    return Array.from(byChapter.entries())
      .sort((a, b) => a[1].order - b[1].order)
      .map(([chapter, { order, words: chapterWords }]) => ({
        chapter,
        chapterOrder: order,
        totalWords: chapterWords.length,
        masteredWords: chapterWords.filter((w) => mastered.has(w.id)).length,
        words: chapterWords as VocabChapterGroup["words"],
      }));
  }

  /**
   * Per-level vocabulary mastery with anchor-based unlock gating: the level matching the user's
   * current target band (and everything below it) is always unlocked — a learner doesn't have to
   * start at B1 if they're aiming for a C1 band. Levels above the anchor still gate sequentially:
   * each one unlocks only once the level directly below it clears the mastery threshold.
   */
  async getLevelProgress(userId: string): Promise<VocabLevelProgress[]> {
    const [levels, user, mastered] = await Promise.all([
      this.listLevels(),
      this.prisma.user.findUnique({ where: { id: userId }, select: { targetBand: true } }),
      this.masteredVocabIds(userId),
    ]);

    const anchor = resolveAnchorVocabLevel(levels, user?.targetBand ?? null);
    const anchorOrder = anchor?.order ?? 0;

    const result: VocabLevelProgress[] = [];
    let previousMet = true;
    for (const level of levels) {
      const words = await this.listByLevel(level.id);
      const masteredWords = words.filter((w) => mastered.has(w.id)).length;
      const masteryPercent = words.length === 0 ? 0 : Math.round((masteredWords / words.length) * 100);
      const met = masteryPercent >= VOCAB_UNLOCK_THRESHOLD;
      const atOrBelowAnchor = level.order <= anchorOrder;
      const unlocked: boolean = atOrBelowAnchor || previousMet;

      result.push({
        levelId: level.id,
        cefrLevel: level.cefrLevel as VocabLevelProgress["cefrLevel"],
        bandLabel: level.bandLabel,
        storyTitle: level.storyTitle,
        totalWords: words.length,
        masteredWords,
        masteryPercent,
        status: !unlocked ? "locked" : met ? "completed" : "unlocked",
        isAnchor: level.id === anchor?.id,
      });

      previousMet = unlocked && met;
    }
    return result;
  }

  /**
   * Every word, across every level up to and including `uptoLevelId`, that the user has already
   * studied at least once — shuffled for a cumulative "test your older words" review session.
   */
  async listReviewableWords(userId: string, uptoLevelId: string) {
    const levels = await this.listLevels();
    const uptoLevel = levels.find((l) => l.id === uptoLevelId);
    const eligibleLevelIds = (uptoLevel ? levels.filter((l) => l.order <= uptoLevel.order) : levels).map((l) => l.id);

    const mastered = await this.masteredVocabIds(userId);
    const words = await this.prisma.vocabItem.findMany({
      where: { vocabLevelId: { in: eligibleLevelIds } },
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
