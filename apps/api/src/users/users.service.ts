import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface GoogleProfile {
  googleId: string;
  email: string;
  displayName: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a user and places them directly at `startingStageId` (defaults to
   * the first stage). Earlier stages are marked `completed` — the learner
   * self-placed past them — so the roadmap doesn't show them as locked.
   */
  async create(email: string, displayName: string, targetBand?: number, startingStageId?: string) {
    const startingStage = await this.resolveStartingStage(startingStageId);
    const user = await this.prisma.user.create({
      data: { email, displayName, currentStageId: startingStage.id, targetBand },
    });
    await this.initializeStageProgress(user.id, startingStage);
    return user;
  }

  /** Finds a user by Google account id, linking to a matching email if one already exists, else creates one. */
  async findOrCreateByGoogle(profile: GoogleProfile, startingStageId?: string) {
    const existingByGoogleId = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (existingByGoogleId) return existingByGoogleId;

    const existingByEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (existingByEmail) {
      return this.prisma.user.update({ where: { id: existingByEmail.id }, data: { googleId: profile.googleId } });
    }

    const startingStage = await this.resolveStartingStage(startingStageId);
    const user = await this.prisma.user.create({
      data: {
        email: profile.email,
        displayName: profile.displayName,
        googleId: profile.googleId,
        currentStageId: startingStage.id,
      },
    });
    await this.initializeStageProgress(user.id, startingStage);
    return user;
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }

  private async resolveStartingStage(startingStageId?: string) {
    const stages = await this.prisma.ieltsStage.findMany({ orderBy: { order: "asc" } });
    if (stages.length === 0) {
      throw new BadRequestException("No IELTS stages are seeded yet — run `pnpm prisma:seed`.");
    }
    const stage = startingStageId ? stages.find((s) => s.id === startingStageId) : stages[0];
    if (!stage) throw new BadRequestException(`Unknown startingStageId "${startingStageId}"`);
    return stage;
  }

  private async initializeStageProgress(userId: string, startingStage: { id: string; order: number }) {
    const stages = await this.prisma.ieltsStage.findMany({ orderBy: { order: "asc" } });
    await this.prisma.$transaction(
      stages
        .filter((s) => s.order <= startingStage.order)
        .map((s) =>
          this.prisma.userStageProgress.upsert({
            where: { userId_stageId: { userId, stageId: s.id } },
            update: {},
            create: {
              userId,
              stageId: s.id,
              status: s.order === startingStage.order ? "in_progress" : "completed",
              unlockedAt: new Date(),
              completedAt: s.order === startingStage.order ? undefined : new Date(),
            },
          }),
        ),
    );
  }
}
