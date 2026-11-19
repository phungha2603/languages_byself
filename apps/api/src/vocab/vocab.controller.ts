import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { VocabService } from "./vocab.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequireSelfGuard } from "../auth/require-self.guard";

@Controller("vocab")
export class VocabController {
  constructor(private readonly vocabService: VocabService) {}

  /** Public reference data — the word bank for one IELTS stage / CEFR level. */
  @Get()
  listByStage(@Query("stageId") stageId?: string) {
    if (!stageId) throw new BadRequestException("stageId query param is required");
    return this.vocabService.listByStage(stageId);
  }

  /** Public too (so the deck list is browsable before sign-in) — `userId` just adds mastery counts per topic. */
  @Get("topics")
  listTopics(@Query("stageId") stageId?: string, @Query("userId") userId?: string) {
    if (!stageId) throw new BadRequestException("stageId query param is required");
    return this.vocabService.listTopicsByStage(stageId, userId);
  }

  @UseGuards(JwtAuthGuard, RequireSelfGuard)
  @Get("progress")
  getLevelProgress(@Query("userId") userId: string) {
    return this.vocabService.getLevelProgress(userId);
  }

  @UseGuards(JwtAuthGuard, RequireSelfGuard)
  @Get("review")
  listReviewableWords(@Query("userId") userId: string, @Query("uptoStageId") uptoStageId: string) {
    if (!uptoStageId) throw new BadRequestException("uptoStageId query param is required");
    return this.vocabService.listReviewableWords(userId, uptoStageId);
  }
}
