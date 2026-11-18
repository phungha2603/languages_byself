import { Injectable, NotFoundException } from "@nestjs/common";
import type { SrsCard, SrsRating } from "@app/shared-types";
import { FsrsScheduler, computeRetentionStats } from "@app/srs-engine";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SrsService {
  private readonly scheduler = new FsrsScheduler();

  constructor(private readonly prisma: PrismaService) {}

  async getDueCards(userId: string, limit = 20) {
    return this.prisma.srsCard.findMany({
      where: { userId, due: { lte: new Date() } },
      include: { vocabItem: true },
      orderBy: { due: "asc" },
      take: limit,
    });
  }

  async review(userId: string, vocabId: string, rating: SrsRating, sessionId?: string) {
    const vocab = await this.prisma.vocabItem.findUnique({ where: { id: vocabId } });
    if (!vocab) throw new NotFoundException(`Vocab item ${vocabId} not found`);

    const existing = await this.prisma.srsCard.findUnique({ where: { userId_vocabId: { userId, vocabId } } });
    const now = new Date();

    const card: SrsCard = existing
      ? {
          id: existing.id,
          userId,
          vocabId,
          due: existing.due.toISOString(),
          stability: existing.stability,
          difficulty: existing.difficulty,
          elapsedDays: existing.elapsedDays,
          scheduledDays: existing.scheduledDays,
          reps: existing.reps,
          lapses: existing.lapses,
          state: existing.state,
          lastReview: existing.lastReview?.toISOString(),
        }
      : {
          id: "",
          userId,
          vocabId,
          due: now.toISOString(),
          stability: 0,
          difficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          reps: 0,
          lapses: 0,
          state: "new",
        };

    const { card: updated, log } = this.scheduler.review(card, rating, now);

    const persistedCard = await this.prisma.srsCard.upsert({
      where: { userId_vocabId: { userId, vocabId } },
      update: {
        due: new Date(updated.due),
        stability: updated.stability,
        difficulty: updated.difficulty,
        elapsedDays: updated.elapsedDays,
        scheduledDays: updated.scheduledDays,
        reps: updated.reps,
        lapses: updated.lapses,
        state: updated.state,
        lastReview: now,
      },
      create: {
        userId,
        vocabId,
        due: new Date(updated.due),
        stability: updated.stability,
        difficulty: updated.difficulty,
        elapsedDays: updated.elapsedDays,
        scheduledDays: updated.scheduledDays,
        reps: updated.reps,
        lapses: updated.lapses,
        state: updated.state,
        lastReview: now,
      },
    });

    await this.prisma.srsReviewLog.create({
      data: {
        cardId: persistedCard.id,
        sessionId,
        rating: log.rating,
        elapsedDays: log.elapsedDays,
        scheduledDays: log.scheduledDays,
        stabilityBefore: log.stabilityBefore,
        stabilityAfter: log.stabilityAfter,
        difficultyBefore: log.difficultyBefore,
        difficultyAfter: log.difficultyAfter,
      },
    });

    return persistedCard;
  }

  async getRetentionStats(userId: string, stageId: string) {
    const cards = await this.prisma.srsCard.findMany({ where: { userId } });
    return computeRetentionStats(
      cards.map((c) => ({
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
  }
}
