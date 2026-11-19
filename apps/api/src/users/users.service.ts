import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword, verifyPassword } from "../auth/password.util";

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
  async create(email: string, password: string, displayName: string, targetBand?: number, startingStageId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("Email này đã có tài khoản — hãy đăng nhập thay vì đăng ký lại.");
    }
    const startingStage = await this.resolveStartingStage(startingStageId);
    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, displayName, currentStageId: startingStage.id, targetBand },
    });
    await this.initializeStageProgress(user.id, startingStage);
    return this.sanitize(user);
  }

  /** Email+password re-login for an account that isn't Google-only. */
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Email hoặc mật khẩu không đúng.");
    if (!user.passwordHash) {
      throw new UnauthorizedException('Tài khoản này được tạo bằng Google — hãy dùng nút "Đăng nhập với Google".');
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Email hoặc mật khẩu không đúng.");
    return this.sanitize(user);
  }

  /** Finds a user by Google account id, linking to a matching email if one already exists, else creates one. */
  async findOrCreateByGoogle(profile: GoogleProfile, startingStageId?: string) {
    const existingByGoogleId = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (existingByGoogleId) return this.sanitize(existingByGoogleId);

    const existingByEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (existingByEmail) {
      const linked = await this.prisma.user.update({ where: { id: existingByEmail.id }, data: { googleId: profile.googleId } });
      return this.sanitize(linked);
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
    return this.sanitize(user);
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return this.sanitize(user);
  }

  async updateProfile(userId: string, data: { displayName?: string; status?: string }) {
    await this.findById(userId);
    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return this.sanitize(updated);
  }

  /** Strips the password hash before a user row ever leaves this service. */
  private sanitize<T extends { passwordHash?: string | null }>(user: T): Omit<T, "passwordHash"> {
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
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
