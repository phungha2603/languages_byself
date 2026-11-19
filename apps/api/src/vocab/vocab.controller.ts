import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { VocabService } from "./vocab.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequireSelfGuard } from "../auth/require-self.guard";

@Controller("vocab")
export class VocabController {
  constructor(private readonly vocabService: VocabService) {}

  /** Public reference data — the 4-level progression (B1 -> C2). */
  @Get("levels")
  listLevels() {
    return this.vocabService.listLevels();
  }

  /** Public reference data — the word bank for one level. */
  @Get()
  listByLevel(@Query("levelId") levelId?: string) {
    if (!levelId) throw new BadRequestException("levelId query param is required");
    return this.vocabService.listByLevel(levelId);
  }

  /** Public too (so the deck list is browsable before sign-in) — `userId` just adds mastery counts per chapter. */
  @Get("chapters")
  listChapters(@Query("levelId") levelId?: string, @Query("userId") userId?: string) {
    if (!levelId) throw new BadRequestException("levelId query param is required");
    return this.vocabService.listChaptersByLevel(levelId, userId);
  }

  @UseGuards(JwtAuthGuard, RequireSelfGuard)
  @Get("progress")
  getLevelProgress(@Query("userId") userId: string) {
    return this.vocabService.getLevelProgress(userId);
  }

  @UseGuards(JwtAuthGuard, RequireSelfGuard)
  @Get("review")
  listReviewableWords(@Query("userId") userId: string, @Query("uptoLevelId") uptoLevelId: string) {
    if (!uptoLevelId) throw new BadRequestException("uptoLevelId query param is required");
    return this.vocabService.listReviewableWords(userId, uptoLevelId);
  }

  /**
   * Public, like the other reference-data routes — this just fills in a shared cache field on
   * a VocabItem (definition/example/translation), not anything user-specific.
   */
  @Post(":id/enrich")
  enrichWord(@Param("id") id: string) {
    return this.vocabService.enrichWord(id);
  }
}
