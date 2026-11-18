import type { ExerciseAttempt, SrsCard } from "@app/shared-types";
import { describe, expect, it } from "vitest";
import { buildWeaknessProfile, unresolvedGrammarWeaknesses } from "./weakness.js";

function attempt(partial: Partial<ExerciseAttempt> & Pick<ExerciseAttempt, "skill" | "accuracy">): ExerciseAttempt {
  return {
    id: Math.random().toString(36),
    userId: "user-1",
    exerciseId: "ex-1",
    score: partial.accuracy,
    timeSpentSec: 60,
    mistakes: [],
    submittedAt: new Date().toISOString(),
    ...partial,
  };
}

function card(partial: Partial<SrsCard> & Pick<SrsCard, "vocabId">): SrsCard {
  return {
    id: `user-1:${partial.vocabId}`,
    userId: "user-1",
    due: new Date().toISOString(),
    stability: 5,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 1,
    reps: 1,
    lapses: 0,
    state: "review",
    ...partial,
  };
}

describe("buildWeaknessProfile", () => {
  it("defaults mastery to 0 for skills with no attempts", () => {
    const profile = buildWeaknessProfile("user-1", "band-4-5", [], []);
    expect(profile.skillMastery.listening).toBe(0);
    expect(profile.skillMastery.writing).toBe(0);
  });

  it("averages the most recent attempts per skill", () => {
    const attempts = [
      attempt({ skill: "reading", accuracy: 80 }),
      attempt({ skill: "reading", accuracy: 60 }),
    ];
    const profile = buildWeaknessProfile("user-1", "band-4-5", attempts, []);
    expect(profile.skillMastery.reading).toBe(70);
  });

  it("aggregates recurring grammar mistakes and lowers mastery with each recurrence", () => {
    const attempts = [
      attempt({
        skill: "writing",
        accuracy: 50,
        mistakes: [{ category: "grammar", detail: "wrong tense", grammarTopic: "present_perfect" }],
      }),
      attempt({
        skill: "writing",
        accuracy: 55,
        mistakes: [{ category: "grammar", detail: "wrong tense again", grammarTopic: "present_perfect" }],
      }),
    ];
    const profile = buildWeaknessProfile("user-1", "band-4-5", attempts, []);
    expect(profile.grammarWeaknesses).toHaveLength(1);
    expect(profile.grammarWeaknesses[0]!.occurrences).toBe(2);
    expect(profile.grammarWeaknesses[0]!.masteryScore).toBe(70);
  });

  it("surfaces vocab items that have lapsed in SRS, worst-first", () => {
    const cards = [card({ vocabId: "v1", lapses: 1 }), card({ vocabId: "v2", lapses: 3 })];
    const profile = buildWeaknessProfile("user-1", "band-4-5", [], cards, { v1: "apple", v2: "ubiquitous" });
    expect(profile.vocabWeaknesses[0]!.vocabId).toBe("v2");
    expect(profile.vocabWeaknesses[0]!.headword).toBe("ubiquitous");
  });
});

describe("unresolvedGrammarWeaknesses", () => {
  it("filters out topics that have cleared the mastery threshold", () => {
    const weaknesses = [
      { topic: "a", occurrences: 1, lastSeen: "", masteryScore: 85 },
      { topic: "b", occurrences: 3, lastSeen: "", masteryScore: 55 },
    ];
    expect(unresolvedGrammarWeaknesses(weaknesses)).toHaveLength(1);
    expect(unresolvedGrammarWeaknesses(weaknesses)[0]!.topic).toBe("b");
  });
});
