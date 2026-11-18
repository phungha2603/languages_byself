import type { DifficultyAdjustment, Skill } from "@app/shared-types";
import { DIFFICULTY_STEP, MAX_DIFFICULTY, MIN_DIFFICULTY, TARGET_ACCURACY_LOWER, TARGET_ACCURACY_UPPER } from "./constants.js";

/**
 * Simple hill-climbing difficulty controller: nudge difficulty up when the
 * learner is comfortably above the target accuracy band (too easy), down
 * when comfortably below it (too hard), and hold steady inside the band.
 */
export function adjustDifficulty(skill: Skill, currentDifficulty: number, recentAccuracy: number): DifficultyAdjustment {
  if (recentAccuracy >= TARGET_ACCURACY_UPPER) {
    const newDifficulty = Math.min(MAX_DIFFICULTY, currentDifficulty + DIFFICULTY_STEP);
    return {
      skill,
      previousDifficulty: currentDifficulty,
      newDifficulty,
      reason: `Recent accuracy ${recentAccuracy}% is above the ${TARGET_ACCURACY_UPPER}% comfort ceiling — raising difficulty.`,
    };
  }

  if (recentAccuracy <= TARGET_ACCURACY_LOWER) {
    const newDifficulty = Math.max(MIN_DIFFICULTY, currentDifficulty - DIFFICULTY_STEP);
    return {
      skill,
      previousDifficulty: currentDifficulty,
      newDifficulty,
      reason: `Recent accuracy ${recentAccuracy}% is below the ${TARGET_ACCURACY_LOWER}% floor — lowering difficulty.`,
    };
  }

  return {
    skill,
    previousDifficulty: currentDifficulty,
    newDifficulty: currentDifficulty,
    reason: `Recent accuracy ${recentAccuracy}% is within the target band — holding difficulty steady.`,
  };
}

export function adjustAllDifficulties(
  currentDifficulties: Record<Skill, number>,
  recentAccuracyBySkill: Record<Skill, number>,
): Record<Skill, DifficultyAdjustment> {
  const result = {} as Record<Skill, DifficultyAdjustment>;
  for (const skill of Object.keys(currentDifficulties) as Skill[]) {
    result[skill] = adjustDifficulty(skill, currentDifficulties[skill]!, recentAccuracyBySkill[skill] ?? 0);
  }
  return result;
}
