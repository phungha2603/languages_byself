import { IsIn, IsString } from "class-validator";
import { SPEAKING_PARTS, type SpeakingPart } from "@app/shared-types";

export class GradeSpeakingDto {
  @IsIn(SPEAKING_PARTS)
  part!: SpeakingPart;

  @IsString()
  prompt!: string;

  @IsString()
  transcript!: string;
}
