import { Injectable } from "@nestjs/common";
import type { ExerciseAttempt, Mistake, Skill, SrsCard } from "@app/shared-types";
import { SKILLS } from "@app/shared-types";
import { buildWeaknessProfile, adjustAllDifficulties, planNextSession } from "@app/orchestrator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrchestratorService {
  constructor(private readonly prisma: PrismaService) {}

  /** Recomputes the weakness profile from raw attempt/SRS history and caches a snapshot. */
  async refreshWeaknessProfile(userId: string, stageId: string) {
    const [attemptRows, cardRows] = await Promise.all([
      this.prisma.exerciseAttempt.findMany({
        where: { userId, exercise: { stageId } },
        orderBy: { submittedAt: "desc" },
        take: 200,
      }),
      this.prisma.srsCard.findMany({ where: { userId }, include: { vocabItem: true } }),
    ]);

    const attempts: ExerciseAttempt[] = attemptRows.map((a) => ({
      id: a.id,
      userId: a.userId,
      exerciseId: a.exerciseId,
      skill: a.skill as Skill,
      score: a.score,
      accuracy: a.accuracy,
      timeSpentSec: a.timeSpentSec,
      mistakes: a.mistakes as unknown as Mistake[],
      submittedAt: a.submittedAt.toISOString(),
    }));

    const cards: SrsCard[] = cardRows.map((c) => ({
      id: c.id,
      userId: c.userId,
      vocabId: c.vocabId,
      due: c.due.toISOString(),
      stability: c.stability,
      difficulty: c.difficulty,
      elapsedDays: c.elapsedDays,
      scheduledDays: c.scheduledDays,
      reps: c.reps,
      lapses: c.lapses,
      state: c.state,
      lastReview: c.lastReview?.toISOString(),
    }));

    const headwords: Record<string, string> = Object.fromEntries(cardRows.map((c) => [c.vocabId, c.vocabItem.headword]));

    const profile = buildWeaknessProfile(userId, stageId, attempts, cards, headwords);

    await this.prisma.weaknessProfileSnapshot.create({
      data: {
        userId,
        stageId,
        skillMastery: profile.skillMastery,
        skillAccuracyTrend: profile.skillAccuracyTrend,
        grammarWeaknesses: profile.grammarWeaknesses.map((w) => ({ ...w })),
        vocabWeaknesses: profile.vocabWeaknesses.map((w) => ({ ...w })),
      },
    });

    return profile;
  }

  async getCurrentDifficulties(userId: string): Promise<Record<Skill, number>> {
    const rows = await this.prisma.userSkillDifficulty.findMany({ where: { userId } });
    const bySkill = Object.fromEntries(rows.map((r) => [r.skill, r.difficulty])) as Partial<Record<Skill, number>>;
    const result = {} as Record<Skill, number>;
    for (const skill of SKILLS) result[skill] = bySkill[skill] ?? 3;
    return result;
  }

  /** Applies packages/orchestrator's difficulty controller and persists the new dial positions. */
  async retuneDifficulties(userId: string, profile: { skillMastery: Record<Skill, number> }) {
    const current = await this.getCurrentDifficulties(userId);
    const adjustments = adjustAllDifficulties(current, profile.skillMastery);

    await this.prisma.$transaction(
      SKILLS.map((skill) =>
        this.prisma.userSkillDifficulty.upsert({
          where: { userId_skill: { userId, skill } },
          update: { difficulty: adjustments[skill]!.newDifficulty },
          create: { userId, skill, difficulty: adjustments[skill]!.newDifficulty },
        }),
      ),
    );

    return adjustments;
  }

  async getNextSessionPlan(userId: string, stageId: string) {
    const profile = await this.refreshWeaknessProfile(userId, stageId);
    await this.retuneDifficulties(userId, profile);
    const difficulties = await this.getCurrentDifficulties(userId);
    return planNextSession(profile, difficulties);
  }
}
