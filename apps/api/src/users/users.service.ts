import { Injectable, NotFoundException } from "@nestjs/common";
import { DEFAULT_IELTS_STAGES } from "@app/shared-types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(email: string, displayName: string, targetBand?: number) {
    const firstStage = DEFAULT_IELTS_STAGES[0]!;
    return this.prisma.user.create({
      data: { email, displayName, currentStageId: firstStage.id, targetBand },
    });
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }
}
