import { Module } from "@nestjs/common";
import { VocabService } from "./vocab.service";
import { VocabController } from "./vocab.controller";
import { AuthGuardsModule } from "../auth/auth-guards.module";

@Module({
  imports: [AuthGuardsModule],
  providers: [VocabService],
  controllers: [VocabController],
})
export class VocabModule {}
