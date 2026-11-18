import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VocabService {
  constructor(private readonly prisma: PrismaService) {}

  /** The curated word bank for one IELTS stage (== one CEFR level), alphabetical. */
  async listByStage(stageId: string) {
    return this.prisma.vocabItem.findMany({
      where: { stageIds: { array_contains: stageId } },
      orderBy: { headword: "asc" },
    });
  }
}
