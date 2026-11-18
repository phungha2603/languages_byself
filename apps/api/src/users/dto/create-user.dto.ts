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
}
