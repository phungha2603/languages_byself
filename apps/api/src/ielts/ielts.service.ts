import { Injectable, NotFoundException } from "@nestjs/common";
import type { BandExitCriteria, IeltsBandStage, Skill } from "@app/shared-types";
import { SKILLS } from "@app/shared-types";
import { decideStageGate, evaluateStageExit } from "@app/orchestrator";
import { computeRetentionStats } from "@app/srs-engine";
import { PrismaService } from "../prisma/prisma.service";
import { OrchestratorService } from "../orchestrator/orchestrator.service";

@Injectable()
export class IeltsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  async listStages(): Promise<IeltsBandStage[]> {
    const rows = await this.prisma.ieltsStage.findMany({ orderBy: { order: "asc" } });
    return rows.map((r) => this.toStage(r));
  }

  async getUserProgress(userId: string) {
    return this.prisma.userStageProgress.findMany({ where: { userId }, include: { stage: true } });
  }

  private toStage(row: {
    id: string;
    order: number;
    label: string;
    minBand: number;
    maxBand: number;
    description: string;
    exitCriteria: unknown;
  }): IeltsBandStage {
    return {
      id: row.id,
      order: row.order,
      label: row.label,
      minBand: row.minBand,
      maxBand: row.maxBand,
      description: row.description,
      exitCriteria: row.exitCriteria as BandExitCriteria,
    };
  }

  /**
   * Runs the full stage-gate check: rebuilds the weakness profile, pulls SRS
   * retention + exercise-completion counts, evaluates against this stage's
   * exit criteria, and — on a pass — unlocks the next stage for the user.
   */
  async evaluateGate(userId: string, stageId: string, mockAssessmentScore: number | null) {
    const stageRows = await this.prisma.ieltsStage.findMany({ orderBy: { order: "asc" } });
    const stageRow = stageRows.find((s) => s.id === stageId);
    if (!stageRow) throw new NotFoundException(`IELTS stage ${stageId} not found`);
    const allStages = stageRows.map((r) => this.toStage(r));
    const stage = this.toStage(stageRow);

    const profile = await this.orchestratorService.refreshWeaknessProfile(userId, stageId);

    const attemptCounts = await this.prisma.exerciseAttempt.groupBy({
      by: ["skill"],
      where: { userId, exercise: { stageId } },
      _count: { _all: true },
    });
    const exercisesCompletedPerSkill = {} as Record<Skill, number>;
    for (const skill of SKILLS) exercisesCompletedPerSkill[skill] = 0;
    for (const row of attemptCounts) exercisesCompletedPerSkill[row.skill as Skill] = row._count._all;

    const cardRows = await this.prisma.srsCard.findMany({ where: { userId } });
    const retention = computeRetentionStats(
      cardRows.map((c) => ({
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
      })),
      userId,
      stageId,
    );

    const evaluation = evaluateStageExit(profile, exercisesCompletedPerSkill, stage, retention, mockAssessmentScore);
    const decision = decideStageGate(userId, stage, evaluation, allStages);

    await this.prisma.bandExitEvaluationLog.create({
      data: {
        userId,
        stageId,
        passed: evaluation.passed,
        skillAccuracy: evaluation.skillAccuracy,
        vocabRetention: evaluation.vocabRetention,
        mockAssessmentScore: evaluation.mockAssessmentScore ?? undefined,
        openGrammarWeaknesses: evaluation.openGrammarWeaknesses,
        unmetCriteria: evaluation.unmetCriteria,
      },
    });

    if (decision.action === "unlock_next_stage" && decision.nextStageId) {
      await this.prisma.$transaction([
        this.prisma.userStageProgress.upsert({
          where: { userId_stageId: { userId, stageId } },
          update: { status: "completed", completedAt: new Date() },
          create: { userId, stageId, status: "completed", completedAt: new Date() },
        }),
        this.prisma.userStageProgress.upsert({
          where: { userId_stageId: { userId, stageId: decision.nextStageId } },
          update: { status: "unlocked", unlockedAt: new Date() },
          create: { userId, stageId: decision.nextStageId, status: "unlocked", unlockedAt: new Date() },
        }),
        this.prisma.user.update({ where: { id: userId }, data: { currentStageId: decision.nextStageId } }),
      ]);
    }

    return decision;
  }
}
