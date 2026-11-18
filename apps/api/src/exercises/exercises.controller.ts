import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { Skill, SpeakingPart, WritingTaskType } from "@app/shared-types";
import { ExercisesService } from "./exercises.service";
import { SubmitAttemptDto } from "./dto/submit-attempt.dto";
import { GradeExerciseSpeakingDto, GradeExerciseWritingDto } from "./dto/grade-exercise.dto";
import { GradingService } from "../grading/grading.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequireSelfGuard } from "../auth/require-self.guard";

@Controller("exercises")
export class ExercisesController {
  constructor(
    private readonly exercisesService: ExercisesService,
    private readonly gradingService: GradingService,
  ) {}

  @Get()
  list(@Query("stageId") stageId: string, @Query("skill") skill?: Skill, @Query("maxDifficulty") maxDifficulty?: string) {
    return this.exercisesService.listByStage(stageId, skill, maxDifficulty ? Number(maxDifficulty) : undefined);
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.exercisesService.getById(id);
  }

  @UseGuards(JwtAuthGuard, RequireSelfGuard)
  @Post(":id/attempts")
  submitAttempt(@Param("id") id: string, @Query("userId") userId: string, @Body() dto: SubmitAttemptDto) {
    return this.exercisesService.submitAttempt(userId, id, dto);
  }

  /** AI-grades a Writing submission against IELTS's rubric and records the result as an attempt. */
  @UseGuards(JwtAuthGuard, RequireSelfGuard)
  @Post(":id/grade-writing")
  async gradeWriting(@Param("id") id: string, @Query("userId") userId: string, @Body() dto: GradeExerciseWritingDto) {
    const exercise = await this.exercisesService.getById(id);
    const taskType: WritingTaskType = dto.taskType ?? (exercise.content as { taskType?: WritingTaskType }).taskType ?? "task2";
    const grading = await this.gradingService.gradeWriting({ taskType, prompt: exercise.prompt, essay: dto.essay });
    const attempt = await this.exercisesService.recordGradedAttempt(userId, id, grading, dto.sessionId, dto.timeSpentSec);
    return { attempt, grading };
  }

  /** AI-grades a Speaking transcript against IELTS's rubric and records the result as an attempt. */
  @UseGuards(JwtAuthGuard, RequireSelfGuard)
  @Post(":id/grade-speaking")
  async gradeSpeaking(@Param("id") id: string, @Query("userId") userId: string, @Body() dto: GradeExerciseSpeakingDto) {
    const exercise = await this.exercisesService.getById(id);
    const part: SpeakingPart = dto.part ?? (exercise.content as { part?: SpeakingPart }).part ?? "part2";
    const grading = await this.gradingService.gradeSpeaking({ part, prompt: exercise.prompt, transcript: dto.transcript });
    const attempt = await this.exercisesService.recordGradedAttempt(userId, id, grading, dto.sessionId, dto.timeSpentSec);
    return { attempt, grading };
  }
}
