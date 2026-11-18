import type { Skill } from "./skill.js";

export interface GrammarWeakness {
  topic: string;
  occurrences: number;
  lastSeen: string;
  /** 0-100, rises as the learner demonstrates correct usage in later attempts. */
  masteryScore: number;
}

export interface VocabWeakness {
  vocabId: string;
  headword: string;
  lapses: number;
  lastSeen: string;
}

/**
 * The orchestrator's rolling model of one user's ability. Rebuilt after every
 * attempt/review; drives difficulty adjustment and band-gating decisions.
 */
export interface WeaknessProfile {
  userId: string;
  stageId: string;
  generatedAt: string;
  skillMastery: Record<Skill, number>;
  skillAccuracyTrend: Record<Skill, number[]>;
  grammarWeaknesses: GrammarWeakness[];
  vocabWeaknesses: VocabWeakness[];
}
