import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { SrsService } from "./srs.service";
import { ReviewCardDto } from "./dto/review-card.dto";

@Controller("srs")
export class SrsController {
  constructor(private readonly srsService: SrsService) {}

  @Get("users/:userId/due")
  getDueCards(@Param("userId") userId: string, @Query("limit") limit?: string) {
    return this.srsService.getDueCards(userId, limit ? Number(limit) : undefined);
  }

  @Post("users/:userId/review")
  review(@Param("userId") userId: string, @Body() dto: ReviewCardDto) {
    return this.srsService.review(userId, dto.vocabId, dto.rating, dto.sessionId);
  }

  @Get("users/:userId/retention")
  getRetention(@Param("userId") userId: string, @Query("stageId") stageId: string) {
    return this.srsService.getRetentionStats(userId, stageId);
  }
}
