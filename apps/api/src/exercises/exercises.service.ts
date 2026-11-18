import { Injectable, NotFoundException } from "@nestjs/common";
import type { Skill } from "@app/shared-types";
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
}
