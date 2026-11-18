import type { WeaknessProfile } from "@app/shared-types";
import { describe, expect, it } from "vitest";
import { planNextSession } from "./planner.js";

function profile(overrides: Partial<WeaknessProfile> = {}): WeaknessProfile {
  return {
    userId: "user-1",
    stageId: "band-4-5",
    generatedAt: new Date().toISOString(),
    skillMastery: { listening: 80, speaking: 75, reading: 90, writing: 40 },
    skillAccuracyTrend: { listening: [], speaking: [], reading: [], writing: [] },
    grammarWeaknesses: [],
    vocabWeaknesses: [],
    ...overrides,
  };
}

describe("planNextSession", () => {
  it("focuses on the two weakest skills", () => {
    const plan = planNextSession(profile(), { listening: 3, speaking: 3, reading: 3, writing: 3 });
    expect(plan.focusSkills).toEqual(["writing", "speaking"]);
  });

  it("includes a vocab flashcard spec when vocab weaknesses exist", () => {
    const plan = planNextSession(
      profile({ vocabWeaknesses: [{ vocabId: "v1", headword: "ubiquitous", lapses: 2, lastSeen: "" }] }),
      { listening: 3, speaking: 3, reading: 3, writing: 3 },
    );
    expect(plan.recommendedExerciseSpecs.some((s) => s.exerciseType === "vocab_flashcard")).toBe(true);
  });

  it("only reinforces grammar topics on writing/speaking specs", () => {
    const plan = planNextSession(
      profile({ grammarWeaknesses: [{ topic: "articles", occurrences: 2, lastSeen: "", masteryScore: 50 }] }),
      { listening: 3, speaking: 3, reading: 3, writing: 3 },
    );
    const nonLanguageSkillSpecs = plan.recommendedExerciseSpecs.filter((s) => s.skill === "listening" || s.skill === "reading");
    for (const spec of nonLanguageSkillSpecs) {
      if (spec.exerciseType === "vocab_flashcard") continue;
      expect(spec.reinforceGrammarTopics).toHaveLength(0);
    }
  });

  it("carries the target difficulty tuned for each skill", () => {
    const plan = planNextSession(profile(), { listening: 3, speaking: 3, reading: 3, writing: 7 });
    const writingSpec = plan.recommendedExerciseSpecs.find((s) => s.skill === "writing");
    expect(writingSpec?.targetDifficulty).toBe(7);
  });
});
