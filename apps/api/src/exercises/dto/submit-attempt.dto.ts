import { Type } from "class-transformer";
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import { MistakeCategory } from "@app/shared-types";

const MISTAKE_CATEGORIES: MistakeCategory[] = [
  "grammar",
  "vocabulary",
  "pronunciation",
  "comprehension",
  "fluency",
  "task_response",
];

export class MistakeDto {
  @IsIn(MISTAKE_CATEGORIES)
  category!: MistakeCategory;

  @IsString()
  detail!: string;

  @IsOptional()
  @IsString()
  grammarTopic?: string;

  @IsOptional()
  @IsString()
  vocabId?: string;
}

export class SubmitAttemptDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  accuracy!: number;

  @IsNumber()
  @Min(0)
  timeSpentSec!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MistakeDto)
  mistakes!: MistakeDto[];

  @IsOptional()
  @IsString()
  sessionId?: string;
}
