import { PrismaClient } from "@prisma/client";
import { DEFAULT_IELTS_STAGES, type BandExitCriteria } from "@app/shared-types";

const prisma = new PrismaClient();

/**
 * Exit criteria get stricter at every stage: higher accuracy bars, more
 * required reps, tighter grammar tolerance. Tune these numbers once real
 * usage data comes in — they're reasonable starting defaults, not holy writ.
 */
function exitCriteriaFor(order: number): BandExitCriteria {
  const accuracy = 65 + order * 5;
  const exercises = 15 + order * 5;
  return {
    minSkillAccuracy: { listening: accuracy, speaking: accuracy, reading: accuracy, writing: accuracy },
    minExercisesPerSkill: { listening: exercises, speaking: exercises, reading: exercises, writing: exercises },
    minVocabRetention: 75 + order * 3,
    minMockAssessmentScore: 60 + order * 5,
    maxOpenGrammarWeaknesses: Math.max(1, 5 - order),
  };
}

const SAMPLE_VOCAB = [
  { headword: "essential", definitions: ["absolutely necessary; extremely important"], examples: ["Clean water is essential for survival."] },
  { headword: "convenient", definitions: ["fitting in well with a person's needs, activities, and plans"], examples: ["Is it convenient to talk now?"] },
  { headword: "significant", definitions: ["sufficiently great or important to be worthy of attention"], examples: ["There has been a significant increase in sales."] },
  { headword: "consequence", definitions: ["a result or effect of an action or condition"], examples: ["He understood the consequences of his decision."] },
  { headword: "beneficial", definitions: ["resulting in good; favourable or advantageous"], examples: ["Regular exercise is beneficial to your health."] },
] as const;

/** A handful of hand-written sample exercises so a fresh install has something to practice immediately. */
const SAMPLE_EXERCISES = [
  {
    type: "listening_mcq" as const,
    skill: "listening" as const,
    stageId: "foundation",
    difficulty: 2,
    prompt: "Listen to the short announcement and choose what time the shop closes.",
    content: { options: ["6 PM", "8 PM", "9 PM", "10 PM"] },
    answerKey: { correctIndex: 2 },
  },
  {
    type: "reading_mcq" as const,
    skill: "reading" as const,
    stageId: "foundation",
    difficulty: 2,
    prompt:
      "Read: 'Many cities are now encouraging cycling instead of driving, as it reduces traffic and pollution while improving public health.' According to the passage, what is one benefit of cycling mentioned?",
    content: { options: ["It is faster than driving", "It reduces pollution", "It is required by law", "It saves money on fuel"] },
    answerKey: { correctIndex: 1 },
  },
  {
    type: "speaking_cue_card" as const,
    skill: "speaking" as const,
    stageId: "foundation",
    difficulty: 3,
    prompt:
      "Describe a place you like to visit in your free time. You should say: where it is, how often you go there, what you do there, and explain why you like it.",
    content: { part: "part2" },
    answerKey: {},
  },
  {
    type: "writing_task2_essay" as const,
    skill: "writing" as const,
    stageId: "foundation",
    difficulty: 3,
    prompt:
      "Some people believe that students should choose their own subjects at school, while others think the school should decide. Discuss both views and give your own opinion.",
    content: { taskType: "task2" },
    answerKey: {},
  },
] as const;

async function main() {
  for (const stage of DEFAULT_IELTS_STAGES) {
    await prisma.ieltsStage.upsert({
      where: { id: stage.id },
      update: {
        order: stage.order,
        label: stage.label,
        minBand: stage.minBand,
        maxBand: stage.maxBand,
        description: stage.description,
        exitCriteria: { ...exitCriteriaFor(stage.order) },
      },
      create: {
        id: stage.id,
        order: stage.order,
        label: stage.label,
        minBand: stage.minBand,
        maxBand: stage.maxBand,
        description: stage.description,
        exitCriteria: { ...exitCriteriaFor(stage.order) },
      },
    });
  }
  console.log(`Seeded ${DEFAULT_IELTS_STAGES.length} IELTS stages.`);

  for (const vocab of SAMPLE_VOCAB) {
    const existing = await prisma.vocabItem.findFirst({ where: { headword: vocab.headword } });
    if (existing) continue;
    await prisma.vocabItem.create({
      data: {
        headword: vocab.headword,
        definitions: [...vocab.definitions],
        examples: [...vocab.examples],
        translations: {},
        stageIds: ["foundation"],
      },
    });
  }
  console.log(`Seeded ${SAMPLE_VOCAB.length} sample vocabulary items.`);

  for (const exercise of SAMPLE_EXERCISES) {
    const existing = await prisma.exercise.findFirst({ where: { prompt: exercise.prompt } });
    if (existing) continue;
    await prisma.exercise.create({
      data: {
        type: exercise.type,
        skill: exercise.skill,
        stageId: exercise.stageId,
        difficulty: exercise.difficulty,
        prompt: exercise.prompt,
        content: exercise.content,
        grammarTopics: [],
        vocabIds: [],
        answerKey: exercise.answerKey,
      },
    });
  }
  console.log(`Seeded ${SAMPLE_EXERCISES.length} sample exercises.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
