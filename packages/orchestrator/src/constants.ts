import type { ExerciseType, Skill } from "@app/shared-types";

/** Accuracy band the difficulty-adjustment rule tries to keep learners inside. */
export const TARGET_ACCURACY_UPPER = 85;
export const TARGET_ACCURACY_LOWER = 60;
export const DIFFICULTY_STEP = 0.5;
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;

/** How many of the most recent attempts/reviews feed the rolling mastery estimate. */
export const MASTERY_WINDOW = 10;

/** A grammar topic counts as "resolved" once its mastery score clears this bar. */
export const GRAMMAR_MASTERY_THRESHOLD = 70;

export const DEFAULT_EXERCISE_TYPES_BY_SKILL: Record<Skill, ExerciseType[]> = {
  listening: ["listening_mcq", "listening_dictation", "listening_note_completion"],
  speaking: ["speaking_shadowing", "speaking_qa", "speaking_cue_card"],
  reading: ["reading_mcq", "reading_true_false_not_given", "reading_matching_headings"],
  writing: ["writing_task1_report", "writing_task2_essay", "grammar_cloze"],
};
