import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import type { Skill } from "@app/shared-types";
import { ExercisesService } from "./exercises.service";
import { SubmitAttemptDto } from "./dto/submit-attempt.dto";

@Controller("exercises")
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  list(@Query("stageId") stageId: string, @Query("skill") skill?: Skill, @Query("maxDifficulty") maxDifficulty?: string) {
    return this.exercisesService.listByStage(stageId, skill, maxDifficulty ? Number(maxDifficulty) : undefined);
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.exercisesService.getById(id);
  }

  @Post(":id/attempts")
  submitAttempt(@Param("id") id: string, @Query("userId") userId: string, @Body() dto: SubmitAttemptDto) {
    return this.exercisesService.submitAttempt(userId, id, dto);
  }
}
