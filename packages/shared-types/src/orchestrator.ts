import type { Skill } from "./skill.js";
import type { ExerciseType, DifficultyLevel } from "./exercise.js";
import type { BandExitEvaluation } from "./ielts.js";

/** What the orchestrator wants the user to do next, and why. */
export interface NextSessionPlan {
  userId: string;
  stageId: string;
  generatedAt: string;
  /** Ordered list; the client presents these as the recommended session. */
  recommendedExerciseSpecs: RecommendedExerciseSpec[];
  focusSkills: Skill[];
  rationale: string[];
}

export interface RecommendedExerciseSpec {
  skill: Skill;
  exerciseType: ExerciseType;
  targetDifficulty: DifficultyLevel;
  /** Vocab/grammar topics to bias exercise selection or generation toward. */
  reinforceGrammarTopics: string[];
  reinforceVocabIds: string[];
  reason: string;
}

export interface DifficultyAdjustment {
  skill: Skill;
  previousDifficulty: DifficultyLevel;
  newDifficulty: DifficultyLevel;
  reason: string;
}

export interface StageGateDecision {
  userId: string;
  stageId: string;
  evaluation: BandExitEvaluation;
  action: "unlock_next_stage" | "stay_in_stage" | "remediate";
  nextStageId?: string;
}
