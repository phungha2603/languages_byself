import { Injectable, NotFoundException } from "@nestjs/common";
import type { GradingResult, Skill } from "@app/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import type { SubmitAttemptDto } from "./dto/submit-attempt.dto";

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async listByStage(stageId: string, skill?: Skill, maxDifficulty?: number) {
    return this.prisma.exercise.findMany({
      where: {
        stageId,
        skill,
        difficulty: maxDifficulty ? { lte: maxDifficulty } : undefined,
      },
      orderBy: { difficulty: "asc" },
    });
  }

  async getById(id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException(`Exercise ${id} not found`);
    return exercise;
  }

  async submitAttempt(userId: string, exerciseId: string, dto: SubmitAttemptDto) {
    const exercise = await this.getById(exerciseId);
    return this.prisma.exerciseAttempt.create({
      data: {
        userId,
        exerciseId,
        sessionId: dto.sessionId,
        skill: exercise.skill,
        score: dto.score,
        accuracy: dto.accuracy,
        timeSpentSec: dto.timeSpentSec,
        mistakes: dto.mistakes.map((m) => ({ ...m })),
      },
    });
  }

  /** Persists an AI-graded Writing/Speaking attempt: band score maps to accuracy on a 0-100 scale. */
  async recordGradedAttempt(userId: string, exerciseId: string, grading: GradingResult, sessionId?: string, timeSpentSec = 0) {
    const exercise = await this.getById(exerciseId);
    const accuracy = Math.round((grading.overallBand / 9) * 100);
    return this.prisma.exerciseAttempt.create({
      data: {
        userId,
        exerciseId,
        sessionId,
        skill: exercise.skill,
        score: accuracy,
        accuracy,
        timeSpentSec,
        mistakes: grading.mistakes.map((m) => ({ ...m })),
        bandScore: grading.overallBand,
        rubricBreakdown: {
          criteria: grading.criteria.map((c) => ({ ...c })),
          feedback: grading.feedback,
          provider: grading.provider,
        },
      },
    });
  }
}
