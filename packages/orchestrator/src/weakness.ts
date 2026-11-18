import type { ExerciseAttempt, GrammarWeakness, Skill, SrsCard, VocabWeakness, WeaknessProfile } from "@app/shared-types";
import { SKILLS } from "@app/shared-types";
import { GRAMMAR_MASTERY_THRESHOLD, MASTERY_WINDOW } from "./constants.js";

function mostRecentFirst(attempts: readonly ExerciseAttempt[]): ExerciseAttempt[] {
  return [...attempts].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

/**
 * Rolling mastery per skill: mean accuracy over the last `MASTERY_WINDOW`
 * attempts. No attempts yet reads as 0 (unknown ability is treated as a gap
 * to close, not a strength), which biases early sessions toward coverage.
 */
function computeSkillMastery(attempts: readonly ExerciseAttempt[]): {
  mastery: Record<Skill, number>;
  trend: Record<Skill, number[]>;
} {
  const mastery = {} as Record<Skill, number>;
  const trend = {} as Record<Skill, number[]>;

  for (const skill of SKILLS) {
    const recent = mostRecentFirst(attempts.filter((a) => a.skill === skill)).slice(0, MASTERY_WINDOW);
    trend[skill] = recent.map((a) => a.accuracy).reverse();
    mastery[skill] = recent.length === 0 ? 0 : Math.round(recent.reduce((sum, a) => sum + a.accuracy, 0) / recent.length);
  }

  return { mastery, trend };
}

function computeGrammarWeaknesses(attempts: readonly ExerciseAttempt[]): GrammarWeakness[] {
  const byTopic = new Map<string, { occurrences: number; lastSeen: string }>();

  for (const attempt of mostRecentFirst(attempts)) {
    for (const mistake of attempt.mistakes) {
      if (mistake.category !== "grammar" || !mistake.grammarTopic) continue;
      const existing = byTopic.get(mistake.grammarTopic);
      if (existing) {
        existing.occurrences += 1;
      } else {
        byTopic.set(mistake.grammarTopic, { occurrences: 1, lastSeen: attempt.submittedAt });
      }
    }
  }

  return [...byTopic.entries()]
    .map(([topic, { occurrences, lastSeen }]) => ({
      topic,
      occurrences,
      lastSeen,
      // Each additional recurrence of the same mistake chips away at mastery.
      masteryScore: Math.max(0, 100 - occurrences * 15),
    }))
    .sort((a, b) => a.masteryScore - b.masteryScore);
}

function computeVocabWeaknesses(cards: readonly SrsCard[], headwords: Record<string, string>): VocabWeakness[] {
  return cards
    .filter((c) => c.lapses > 0)
    .map((c) => ({
      vocabId: c.vocabId,
      headword: headwords[c.vocabId] ?? c.vocabId,
      lapses: c.lapses,
      lastSeen: c.lastReview ?? c.due,
    }))
    .sort((a, b) => b.lapses - a.lapses);
}

/** Topics/words whose mastery clears the bar don't block stage progression. */
export function unresolvedGrammarWeaknesses(weaknesses: readonly GrammarWeakness[]): GrammarWeakness[] {
  return weaknesses.filter((w) => w.masteryScore < GRAMMAR_MASTERY_THRESHOLD);
}

export function buildWeaknessProfile(
  userId: string,
  stageId: string,
  attempts: readonly ExerciseAttempt[],
  srsCards: readonly SrsCard[],
  vocabHeadwords: Record<string, string> = {},
  now: Date = new Date(),
): WeaknessProfile {
  const { mastery, trend } = computeSkillMastery(attempts);

  return {
    userId,
    stageId,
    generatedAt: now.toISOString(),
    skillMastery: mastery,
    skillAccuracyTrend: trend,
    grammarWeaknesses: computeGrammarWeaknesses(attempts),
    vocabWeaknesses: computeVocabWeaknesses(srsCards, vocabHeadwords),
  };
}
