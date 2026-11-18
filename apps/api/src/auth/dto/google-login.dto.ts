import { IsOptional, IsString } from "class-validator";

export class GoogleLoginDto {
  @IsString()
  idToken!: string;

  /** Only used the first time this Google account logs in (account creation). */
  @IsOptional()
  @IsString()
  startingStageId?: string;
}
