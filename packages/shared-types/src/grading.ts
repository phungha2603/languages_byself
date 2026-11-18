import type { Mistake } from "./exercise.js";

export const WRITING_TASK_TYPES = ["task1", "task2"] as const;
export type WritingTaskType = (typeof WRITING_TASK_TYPES)[number];

export const SPEAKING_PARTS = ["part1", "part2", "part3"] as const;
export type SpeakingPart = (typeof SPEAKING_PARTS)[number];

export const WRITING_CRITERIA_BY_TASK: Record<WritingTaskType, readonly string[]> = {
  task1: ["Task Achievement", "Coherence and Cohesion", "Lexical Resource", "Grammatical Range and Accuracy"],
  task2: ["Task Response", "Coherence and Cohesion", "Lexical Resource", "Grammatical Range and Accuracy"],
};

export const SPEAKING_CRITERIA: readonly string[] = [
  "Fluency and Coherence",
  "Lexical Resource",
  "Grammatical Range and Accuracy",
  "Pronunciation",
];

/** One IELTS criterion's score (0-9, in 0.5 steps) plus the examiner-style rationale behind it. */
export interface CriterionScore {
  criterion: string;
  band: number;
  rationale: string;
}

/** Structured output of the AI rubric grader — mirrors how an IELTS examiner reports a result. */
export interface GradingResult {
  overallBand: number;
  criteria: CriterionScore[];
  feedback: string;
  mistakes: Mistake[];
  provider: string;
}

export interface WritingGradingRequest {
  taskType: WritingTaskType;
  prompt: string;
  essay: string;
}

export interface SpeakingGradingRequest {
  part: SpeakingPart;
  prompt: string;
  transcript: string;
}
