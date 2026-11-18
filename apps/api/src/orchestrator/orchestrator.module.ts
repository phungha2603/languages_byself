import { Module } from "@nestjs/common";
import { OrchestratorService } from "./orchestrator.service";
import { OrchestratorController } from "./orchestrator.controller";
import { AuthGuardsModule } from "../auth/auth-guards.module";

@Module({
  imports: [AuthGuardsModule],
  providers: [OrchestratorService],
  controllers: [OrchestratorController],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
