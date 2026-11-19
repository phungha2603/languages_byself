import { Module } from "@nestjs/common";
import { VocabService } from "./vocab.service";
import { VocabController } from "./vocab.controller";
import { AuthGuardsModule } from "../auth/auth-guards.module";
import { DictionaryModule } from "../tools/dictionary/dictionary.module";
import { TranslationModule } from "../tools/translation/translation.module";

@Module({
  imports: [AuthGuardsModule, DictionaryModule, TranslationModule],
  providers: [VocabService],
  controllers: [VocabController],
})
export class VocabModule {}
