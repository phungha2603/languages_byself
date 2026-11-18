import { Module } from "@nestjs/common";
import { IeltsService } from "./ielts.service";
import { IeltsController } from "./ielts.controller";
import { OrchestratorModule } from "../orchestrator/orchestrator.module";

@Module({
  imports: [OrchestratorModule],
  providers: [IeltsService],
  controllers: [IeltsController],
})
export class IeltsModule {}
