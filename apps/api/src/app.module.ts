import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { IeltsModule } from "./ielts/ielts.module";
import { SrsModule } from "./srs/srs.module";
import { ExercisesModule } from "./exercises/exercises.module";
import { OrchestratorModule } from "./orchestrator/orchestrator.module";
import { DictionaryModule } from "./tools/dictionary/dictionary.module";
import { GrammarModule } from "./tools/grammar/grammar.module";
import { TranslationModule } from "./tools/translation/translation.module";
import { TtsModule } from "./tools/tts/tts.module";
import { SttModule } from "./tools/stt/stt.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({ rootPath: join(process.cwd(), "storage"), serveRoot: "/" }),
    PrismaModule,
    UsersModule,
    IeltsModule,
    SrsModule,
    ExercisesModule,
    OrchestratorModule,
    DictionaryModule,
    GrammarModule,
    TranslationModule,
    TtsModule,
    SttModule,
  ],
})
export class AppModule {}
