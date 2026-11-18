import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { SrsService } from "./srs.service";
import { ReviewCardDto } from "./dto/review-card.dto";
import { AddCardDto } from "./dto/add-card.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequireSelfGuard } from "../auth/require-self.guard";

@Controller("srs")
@UseGuards(JwtAuthGuard, RequireSelfGuard)
export class SrsController {
  constructor(private readonly srsService: SrsService) {}

  @Get("users/:userId/due")
  getDueCards(@Param("userId") userId: string, @Query("limit") limit?: string) {
    return this.srsService.getDueCards(userId, limit ? Number(limit) : undefined);
  }

  @Get("users/:userId/cards")
  listAllCards(@Param("userId") userId: string) {
    return this.srsService.listAllCards(userId);
  }

  @Post("users/:userId/cards")
  addCard(@Param("userId") userId: string, @Body() dto: AddCardDto) {
    return this.srsService.addCard(userId, dto.vocabId);
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
