import { Module } from "@nestjs/common";
import { GrammarService } from "./grammar.service";
import { GrammarController } from "./grammar.controller";

@Module({
  providers: [GrammarService],
  controllers: [GrammarController],
  exports: [GrammarService],
})
export class GrammarModule {}
