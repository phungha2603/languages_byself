import type { Skill } from "./skill.js";

/**
 * A learning stage keyed to an IELTS band range. Stages are strictly ordered;
 * the orchestrator only unlocks stage N+1 once a user clears stage N's exit criteria.
 */
export interface IeltsBandStage {
  id: string;
  order: number;
  label: string;
  minBand: number;
  maxBand: number;
  description: string;
  exitCriteria: BandExitCriteria;
}

/** Thresholds a learner must clear, across all 4 skills, to unlock the next stage. */
export interface BandExitCriteria {
  /** Minimum rolling accuracy (0-100) required per skill over the evaluation window. */
  minSkillAccuracy: Record<Skill, number>;
  /** Minimum number of completed exercises per skill in the evaluation window (statistical floor). */
  minExercisesPerSkill: Record<Skill, number>;
  /** Minimum SRS vocabulary retention rate (0-100) for words tagged to this stage. */
  minVocabRetention: number;
  /** Minimum score (0-100) on the stage's gating mock assessment. */
  minMockAssessmentScore: number;
  /** Maximum count of *unresolved* recurring grammar weaknesses allowed. */
  maxOpenGrammarWeaknesses: number;
}

export type BandStageStatus = "locked" | "unlocked" | "in_progress" | "completed";

export interface UserBandProgress {
  userId: string;
  stageId: string;
  status: BandStageStatus;
  unlockedAt?: string;
  completedAt?: string;
  /** Most recent evaluation snapshot against this stage's exit criteria. */
  lastEvaluation?: BandExitEvaluation;
}

export interface BandExitEvaluation {
  evaluatedAt: string;
  passed: boolean;
  skillAccuracy: Record<Skill, number>;
  vocabRetention: number;
  mockAssessmentScore: number | null;
  openGrammarWeaknesses: number;
  /** Human-readable reasons the stage did or did not pass, one per failed criterion. */
  unmetCriteria: string[];
}

/** Default 5-stage IELTS roadmap, each spanning ~1 band of difficulty. */
export const DEFAULT_IELTS_STAGES: readonly Omit<IeltsBandStage, "exitCriteria">[] = [
  { id: "foundation", order: 0, label: "Foundation (Pre-4.0)", minBand: 0, maxBand: 3.5, description: "Core survival vocabulary, basic sentence patterns, phonemic awareness." },
  { id: "band-4-5", order: 1, label: "Band 4.0 - 5.0", minBand: 4.0, maxBand: 5.0, description: "Simple connected discourse, common tenses, everyday topics." },
  { id: "band-5-6", order: 2, label: "Band 5.0 - 6.0", minBand: 5.0, maxBand: 6.0, description: "Coherent paragraphs, wider topic range, more complex grammar." },
  { id: "band-6-7", order: 3, label: "Band 6.0 - 7.0", minBand: 6.0, maxBand: 7.0, description: "Flexible language use, academic vocabulary, nuanced arguments." },
  { id: "band-7-8", order: 4, label: "Band 7.0 - 8.0+", minBand: 7.0, maxBand: 9.0, description: "Precision, idiomatic range, full command under exam conditions." },
];
