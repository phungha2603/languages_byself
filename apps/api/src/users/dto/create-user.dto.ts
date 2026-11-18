import { IsEmail, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  targetBand?: number;

  /** IELTS stage id to start at (see GET /ielts/stages). Defaults to the first stage. */
  @IsOptional()
  @IsString()
  startingStageId?: string;
}
