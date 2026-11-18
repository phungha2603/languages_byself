import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { IeltsModule } from "./ielts/ielts.module";
import { SrsModule } from "./srs/srs.module";
import { VocabModule } from "./vocab/vocab.module";
import { ExercisesModule } from "./exercises/exercises.module";
import { OrchestratorModule } from "./orchestrator/orchestrator.module";
import { DictionaryModule } from "./tools/dictionary/dictionary.module";
import { GrammarModule } from "./tools/grammar/grammar.module";
import { TranslationModule } from "./tools/translation/translation.module";
import { TtsModule } from "./tools/tts/tts.module";
import { SttModule } from "./tools/stt/stt.module";
import { GradingModule } from "./grading/grading.module";
import { AuthModule } from "./auth/auth.module";
import { SpaFallbackModule } from "./spa-fallback/spa-fallback.module";

// Static file serving (audio clips, the mobile web build) is wired
// directly in main.ts with raw Express, not @nestjs/serve-static — see
// the comment there for why its lifecycle-hook-based registration doesn't
// reliably order against SpaFallbackModule's catch-all route below.

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    IeltsModule,
    SrsModule,
    VocabModule,
    ExercisesModule,
    OrchestratorModule,
    DictionaryModule,
    GrammarModule,
    TranslationModule,
    TtsModule,
    SttModule,
    GradingModule,
    AuthModule,
    // Must stay last: its catch-all route must be registered after every
    // other controller's routes so they're all tried first.
    SpaFallbackModule,
  ],
})
export class AppModule {}
