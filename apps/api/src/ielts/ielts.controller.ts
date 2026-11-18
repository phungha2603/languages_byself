import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IeltsService } from "./ielts.service";
import { EvaluateGateDto } from "./dto/evaluate-gate.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequireSelfGuard } from "../auth/require-self.guard";

@Controller("ielts")
export class IeltsController {
  constructor(private readonly ieltsService: IeltsService) {}

  /** Public — needed to show the stage picker before a user signs in. */
  @Get("stages")
  listStages() {
    return this.ieltsService.listStages();
  }

  @UseGuards(JwtAuthGuard, RequireSelfGuard)
  @Get("users/:userId/progress")
  getUserProgress(@Param("userId") userId: string) {
    return this.ieltsService.getUserProgress(userId);
  }

  @UseGuards(JwtAuthGuard, RequireSelfGuard)
  @Post("users/:userId/stages/:stageId/evaluate")
  evaluateGate(@Param("userId") userId: string, @Param("stageId") stageId: string, @Body() dto: EvaluateGateDto) {
    return this.ieltsService.evaluateGate(userId, stageId, dto.mockAssessmentScore ?? null);
  }
}
