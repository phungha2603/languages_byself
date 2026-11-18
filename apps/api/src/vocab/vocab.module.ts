import { Module } from "@nestjs/common";
import { VocabService } from "./vocab.service";
import { VocabController } from "./vocab.controller";

@Module({
  providers: [VocabService],
  controllers: [VocabController],
})
export class VocabModule {}
