import { IsNumber, IsOptional, Max, Min } from "class-validator";

export class EvaluateGateDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  mockAssessmentScore?: number;
}
