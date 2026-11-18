import { Module } from "@nestjs/common";
import { ExercisesService } from "./exercises.service";
import { ExercisesController } from "./exercises.controller";
import { GradingModule } from "../grading/grading.module";
import { AuthGuardsModule } from "../auth/auth-guards.module";

@Module({
  imports: [GradingModule, AuthGuardsModule],
  providers: [ExercisesService],
  controllers: [ExercisesController],
  exports: [ExercisesService],
})
export class ExercisesModule {}
