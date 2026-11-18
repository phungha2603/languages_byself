import type { IeltsBandStage, SrsRetentionStats, WeaknessProfile } from "@app/shared-types";
import { describe, expect, it } from "vitest";
import { decideStageGate, evaluateStageExit } from "./gate.js";

const stage: IeltsBandStage = {
  id: "band-4-5",
  order: 1,
  label: "Band 4.0 - 5.0",
  minBand: 4,
  maxBand: 5,
  description: "",
  exitCriteria: {
    minSkillAccuracy: { listening: 70, speaking: 70, reading: 70, writing: 70 },
    minExercisesPerSkill: { listening: 10, speaking: 10, reading: 10, writing: 10 },
    minVocabRetention: 80,
    minMockAssessmentScore: 65,
    maxOpenGrammarWeaknesses: 2,
  },
};

const nextStage: IeltsBandStage = { ...stage, id: "band-5-6", order: 2, label: "Band 5.0 - 6.0" };

function profile(overrides: Partial<WeaknessProfile> = {}): WeaknessProfile {
  return {
    userId: "user-1",
    stageId: "band-4-5",
    generatedAt: new Date().toISOString(),
    skillMastery: { listening: 80, speaking: 80, reading: 80, writing: 80 },
    skillAccuracyTrend: { listening: [], speaking: [], reading: [], writing: [] },
    grammarWeaknesses: [],
    vocabWeaknesses: [],
    ...overrides,
  };
}

const passingCounts = { listening: 12, speaking: 12, reading: 12, writing: 12 };
const retention: SrsRetentionStats = { userId: "user-1", stageId: "band-4-5", totalCards: 20, matureCards: 15, retentionRate: 90, dueNow: 2 };

describe("evaluateStageExit", () => {
  it("passes when every criterion clears its bar", () => {
    const evaluation = evaluateStageExit(profile(), passingCounts, stage, retention, 75);
    expect(evaluation.passed).toBe(true);
    expect(evaluation.unmetCriteria).toHaveLength(0);
  });

  it("fails and explains when a skill accuracy is below threshold", () => {
    const evaluation = evaluateStageExit(profile({ skillMastery: { listening: 50, speaking: 80, reading: 80, writing: 80 } }), passingCounts, stage, retention, 75);
    expect(evaluation.passed).toBe(false);
    expect(evaluation.unmetCriteria.some((m) => m.includes("listening"))).toBe(true);
  });

  it("fails when no mock assessment has been taken", () => {
    const evaluation = evaluateStageExit(profile(), passingCounts, stage, retention, null);
    expect(evaluation.passed).toBe(false);
    expect(evaluation.unmetCriteria.some((m) => m.includes("mock assessment"))).toBe(true);
  });

  it("fails when unresolved grammar weaknesses exceed the max", () => {
    const grammarHeavy = profile({
      grammarWeaknesses: [
        { topic: "a", occurrences: 3, lastSeen: "", masteryScore: 40 },
        { topic: "b", occurrences: 3, lastSeen: "", masteryScore: 40 },
        { topic: "c", occurrences: 3, lastSeen: "", masteryScore: 40 },
      ],
    });
    const evaluation = evaluateStageExit(grammarHeavy, passingCounts, stage, retention, 75);
    expect(evaluation.passed).toBe(false);
    expect(evaluation.openGrammarWeaknesses).toBe(3);
  });
});

describe("decideStageGate", () => {
  it("unlocks the next stage on a pass", () => {
    const evaluation = evaluateStageExit(profile(), passingCounts, stage, retention, 75);
    const decision = decideStageGate("user-1", stage, evaluation, [stage, nextStage]);
    expect(decision.action).toBe("unlock_next_stage");
    expect(decision.nextStageId).toBe("band-5-6");
  });

  it("recommends remediation when grammar weaknesses are badly over the cap", () => {
    const grammarHeavy = profile({
      grammarWeaknesses: [
        { topic: "a", occurrences: 3, lastSeen: "", masteryScore: 40 },
        { topic: "b", occurrences: 3, lastSeen: "", masteryScore: 40 },
        { topic: "c", occurrences: 3, lastSeen: "", masteryScore: 40 },
      ],
    });
    const evaluation = evaluateStageExit(grammarHeavy, passingCounts, stage, retention, 75);
    const decision = decideStageGate("user-1", stage, evaluation, [stage, nextStage]);
    expect(decision.action).toBe("remediate");
  });

  it("stays in stage for a near-miss that isn't a severe gap", () => {
    const nearMiss = profile({ skillMastery: { listening: 68, speaking: 80, reading: 80, writing: 80 } });
    const evaluation = evaluateStageExit(nearMiss, passingCounts, stage, retention, 75);
    const decision = decideStageGate("user-1", stage, evaluation, [stage, nextStage]);
    expect(decision.action).toBe("stay_in_stage");
  });
});
