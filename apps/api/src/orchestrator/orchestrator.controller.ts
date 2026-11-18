import { Controller, Get, Param, Query } from "@nestjs/common";
import { OrchestratorService } from "./orchestrator.service";

@Controller("orchestrator")
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Get("users/:userId/weakness-profile")
  weaknessProfile(@Param("userId") userId: string, @Query("stageId") stageId: string) {
    return this.orchestratorService.refreshWeaknessProfile(userId, stageId);
  }

  @Get("users/:userId/next-session")
  nextSession(@Param("userId") userId: string, @Query("stageId") stageId: string) {
    return this.orchestratorService.getNextSessionPlan(userId, stageId);
  }
}
