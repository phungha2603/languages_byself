import type { Skill } from "./skill.js";

export const EXERCISE_TYPES = [
  "listening_mcq",
  "listening_dictation",
  "listening_note_completion",
  "speaking_shadowing",
  "speaking_cue_card",
  "speaking_qa",
  "reading_mcq",
  "reading_true_false_not_given",
  "reading_matching_headings",
  "writing_task1_report",
  "writing_task2_essay",
  "grammar_cloze",
  "vocab_flashcard",
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EXERCISE_TYPE_SKILL: Record<ExerciseType, Skill> = {
  listening_mcq: "listening",
  listening_dictation: "listening",
  listening_note_completion: "listening",
  speaking_shadowing: "speaking",
  speaking_cue_card: "speaking",
  speaking_qa: "speaking",
  reading_mcq: "reading",
  reading_true_false_not_given: "reading",
  reading_matching_headings: "reading",
  writing_task1_report: "writing",
  writing_task2_essay: "writing",
  grammar_cloze: "writing",
  vocab_flashcard: "reading",
};

/** Difficulty is a continuous 1-10 scale the orchestrator tunes per user. */
export type DifficultyLevel = number;

export interface Exercise {
  id: string;
  type: ExerciseType;
  skill: Skill;
  stageId: string;
  difficulty: DifficultyLevel;
  prompt: string;
  /** Free-form payload shaped by `type` (audio URL, passage text, cue card topic, etc). */
  content: Record<string, unknown>;
  grammarTopics: string[];
  vocabIds: string[];
  /** Expected answer / rubric, used for scoring. Opaque to clients. */
  answerKey: Record<string, unknown>;
}

export type MistakeCategory = "grammar" | "vocabulary" | "pronunciation" | "comprehension" | "fluency" | "task_response";

export interface Mistake {
  category: MistakeCategory;
  detail: string;
  grammarTopic?: string;
  vocabId?: string;
}

export interface ExerciseAttempt {
  id: string;
  userId: string;
  exerciseId: string;
  skill: Skill;
  score: number;
  accuracy: number;
  timeSpentSec: number;
  mistakes: Mistake[];
  submittedAt: string;
}
