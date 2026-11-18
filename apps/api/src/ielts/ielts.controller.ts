import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { IeltsService } from "./ielts.service";
import { EvaluateGateDto } from "./dto/evaluate-gate.dto";

@Controller("ielts")
export class IeltsController {
  constructor(private readonly ieltsService: IeltsService) {}

  @Get("stages")
  listStages() {
    return this.ieltsService.listStages();
  }

  @Get("users/:userId/progress")
  getUserProgress(@Param("userId") userId: string) {
    return this.ieltsService.getUserProgress(userId);
  }

  @Post("users/:userId/stages/:stageId/evaluate")
  evaluateGate(@Param("userId") userId: string, @Param("stageId") stageId: string, @Body() dto: EvaluateGateDto) {
    return this.ieltsService.evaluateGate(userId, stageId, dto.mockAssessmentScore ?? null);
  }
}
