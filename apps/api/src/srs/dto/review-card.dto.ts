import { IsIn, IsOptional, IsString } from "class-validator";
import { SRS_RATINGS, type SrsRating } from "@app/shared-types";

export class ReviewCardDto {
  @IsString()
  vocabId!: string;

  @IsIn(SRS_RATINGS)
  rating!: SrsRating;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
