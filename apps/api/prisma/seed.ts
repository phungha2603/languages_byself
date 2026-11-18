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
        exitCriteria: exitCriteriaFor(stage.order),
      },
      create: {
        id: stage.id,
        order: stage.order,
        label: stage.label,
        minBand: stage.minBand,
        maxBand: stage.maxBand,
        description: stage.description,
        exitCriteria: exitCriteriaFor(stage.order),
      },
    });
  }
  console.log(`Seeded ${DEFAULT_IELTS_STAGES.length} IELTS stages.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
