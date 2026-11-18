import { IsIn, IsString } from "class-validator";
import { WRITING_TASK_TYPES, type WritingTaskType } from "@app/shared-types";

export class GradeWritingDto {
  @IsIn(WRITING_TASK_TYPES)
  taskType!: WritingTaskType;

  @IsString()
  prompt!: string;

  @IsString()
  essay!: string;
}
