import type {
  BandExitEvaluation,
  IeltsBandStage,
  Skill,
  SrsRetentionStats,
  StageGateDecision,
  WeaknessProfile,
} from "@app/shared-types";
import { SKILLS } from "@app/shared-types";
import { unresolvedGrammarWeaknesses } from "./weakness.js";

/**
 * Checks a user's current weakness profile + SRS retention + mock score
 * against one stage's exit criteria. This is the gate that keeps the next
 * IELTS band locked until the current one is genuinely mastered.
 */
export function evaluateStageExit(
  profile: WeaknessProfile,
  exercisesCompletedPerSkill: Record<Skill, number>,
  stage: IeltsBandStage,
  retention: SrsRetentionStats,
  mockAssessmentScore: number | null,
  now: Date = new Date(),
): BandExitEvaluation {
  const { exitCriteria } = stage;
  const unmetCriteria: string[] = [];

  for (const skill of SKILLS) {
    const accuracy = profile.skillMastery[skill];
    const required = exitCriteria.minSkillAccuracy[skill];
    if (accuracy < required) {
      unmetCriteria.push(`${skill} accuracy ${accuracy}% is below the required ${required}%.`);
    }

    const completed = exercisesCompletedPerSkill[skill] ?? 0;
    const requiredCount = exitCriteria.minExercisesPerSkill[skill];
    if (completed < requiredCount) {
      unmetCriteria.push(`${skill} has only ${completed}/${requiredCount} required exercises completed.`);
    }
  }

  if (retention.retentionRate < exitCriteria.minVocabRetention) {
    unmetCriteria.push(`Vocabulary retention ${retention.retentionRate}% is below the required ${exitCriteria.minVocabRetention}%.`);
  }

  if (mockAssessmentScore === null) {
    unmetCriteria.push("No mock assessment has been completed for this stage yet.");
  } else if (mockAssessmentScore < exitCriteria.minMockAssessmentScore) {
    unmetCriteria.push(`Mock assessment score ${mockAssessmentScore} is below the required ${exitCriteria.minMockAssessmentScore}.`);
  }

  const openGrammarWeaknesses = unresolvedGrammarWeaknesses(profile.grammarWeaknesses).length;
  if (openGrammarWeaknesses > exitCriteria.maxOpenGrammarWeaknesses) {
    unmetCriteria.push(
      `${openGrammarWeaknesses} unresolved grammar weaknesses exceed the allowed maximum of ${exitCriteria.maxOpenGrammarWeaknesses}.`,
    );
  }

  return {
    evaluatedAt: now.toISOString(),
    passed: unmetCriteria.length === 0,
    skillAccuracy: profile.skillMastery,
    vocabRetention: retention.retentionRate,
    mockAssessmentScore,
    openGrammarWeaknesses,
    unmetCriteria,
  };
}

/**
 * Turns an exit evaluation into a concrete gating action. `allStages` must
 * be ordered so the next stage (by `order`) can be resolved on a pass.
 */
export function decideStageGate(
  userId: string,
  stage: IeltsBandStage,
  evaluation: BandExitEvaluation,
  allStages: readonly IeltsBandStage[],
): StageGateDecision {
  if (evaluation.passed) {
    const next = allStages.find((s) => s.order === stage.order + 1);
    return {
      userId,
      stageId: stage.id,
      evaluation,
      action: "unlock_next_stage",
      nextStageId: next?.id,
    };
  }

  const needsRemediation =
    evaluation.openGrammarWeaknesses > stage.exitCriteria.maxOpenGrammarWeaknesses ||
    evaluation.vocabRetention < stage.exitCriteria.minVocabRetention - 15;

  return {
    userId,
    stageId: stage.id,
    evaluation,
    action: needsRemediation ? "remediate" : "stay_in_stage",
  };
}
