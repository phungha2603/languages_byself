import { Module } from "@nestjs/common";
import { IeltsService } from "./ielts.service";
import { IeltsController } from "./ielts.controller";
import { OrchestratorModule } from "../orchestrator/orchestrator.module";
import { AuthGuardsModule } from "../auth/auth-guards.module";

@Module({
  imports: [OrchestratorModule, AuthGuardsModule],
  providers: [IeltsService],
  controllers: [IeltsController],
})
export class IeltsModule {}
