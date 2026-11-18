import { IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { SPEAKING_PARTS, WRITING_TASK_TYPES, type SpeakingPart, type WritingTaskType } from "@app/shared-types";

export class GradeExerciseWritingDto {
  @IsString()
  essay!: string;

  @IsOptional()
  @IsIn(WRITING_TASK_TYPES)
  taskType?: WritingTaskType;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpentSec?: number;
}

export class GradeExerciseSpeakingDto {
  @IsString()
  transcript!: string;

  @IsOptional()
  @IsIn(SPEAKING_PARTS)
  part?: SpeakingPart;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpentSec?: number;
}
