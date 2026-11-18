import type { NextSessionPlan, RecommendedExerciseSpec, Skill, WeaknessProfile } from "@app/shared-types";
import { SKILLS } from "@app/shared-types";
import { DEFAULT_EXERCISE_TYPES_BY_SKILL } from "./constants.js";
import { unresolvedGrammarWeaknesses } from "./weakness.js";

const FOCUS_SKILL_COUNT = 2;
const TOP_GRAMMAR_TOPICS = 2;
const TOP_VOCAB_ITEMS = 3;

function pickExerciseType(skill: Skill, roundRobinSeed: number) {
  const options = DEFAULT_EXERCISE_TYPES_BY_SKILL[skill];
  return options[roundRobinSeed % options.length]!;
}

/**
 * The orchestrator's core adaptive-sequencing step: look at the user's
 * current weakness profile and today's tuned difficulty per skill, then
 * build a concrete, explainable session plan.
 */
export function planNextSession(
  profile: WeaknessProfile,
  difficultyBySkill: Record<Skill, number>,
  now: Date = new Date(),
): NextSessionPlan {
  const rankedSkills = [...SKILLS].sort((a, b) => profile.skillMastery[a] - profile.skillMastery[b]);
  const focusSkills = rankedSkills.slice(0, FOCUS_SKILL_COUNT);

  const weakGrammarTopics = unresolvedGrammarWeaknesses(profile.grammarWeaknesses)
    .slice(0, TOP_GRAMMAR_TOPICS)
    .map((w) => w.topic);
  const weakVocabIds = profile.vocabWeaknesses.slice(0, TOP_VOCAB_ITEMS).map((w) => w.vocabId);

  const rationale: string[] = [];
  const recommendedExerciseSpecs: RecommendedExerciseSpec[] = [];

  focusSkills.forEach((skill, index) => {
    const exerciseType = pickExerciseType(skill, index);
    recommendedExerciseSpecs.push({
      skill,
      exerciseType,
      targetDifficulty: difficultyBySkill[skill] ?? 3,
      reinforceGrammarTopics: skill === "writing" || skill === "speaking" ? weakGrammarTopics : [],
      reinforceVocabIds: weakVocabIds,
      reason: `${skill} mastery is ${profile.skillMastery[skill]}%, the ${index === 0 ? "lowest" : "second-lowest"} of your 4 skills.`,
    });
    rationale.push(`Prioritizing ${skill} (mastery ${profile.skillMastery[skill]}%).`);
  });

  if (weakVocabIds.length > 0) {
    recommendedExerciseSpecs.push({
      skill: "reading",
      exerciseType: "vocab_flashcard",
      targetDifficulty: difficultyBySkill.reading ?? 3,
      reinforceGrammarTopics: [],
      reinforceVocabIds: weakVocabIds,
      reason: `${weakVocabIds.length} vocabulary item(s) are lapsing in spaced repetition.`,
    });
    rationale.push(`${weakVocabIds.length} SRS word(s) need reinforcement before they're forgotten.`);
  }

  if (weakGrammarTopics.length > 0) {
    rationale.push(`Recurring grammar issues to target: ${weakGrammarTopics.join(", ")}.`);
  }

  return {
    userId: profile.userId,
    stageId: profile.stageId,
    generatedAt: now.toISOString(),
    recommendedExerciseSpecs,
    focusSkills,
    rationale,
  };
}
