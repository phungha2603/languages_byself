import { Body, Controller, Post } from "@nestjs/common";
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { TtsService } from "./tts.service";

class SynthesizeDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  voice?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(4.0)
  speed?: number;

  @IsOptional()
  @IsIn(["en-US", "en-GB", "en-AU"])
  accent?: "en-US" | "en-GB" | "en-AU";
}

@Controller("tools/tts")
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post()
  synthesize(@Body() dto: SynthesizeDto) {
    return this.ttsService.synthesize(dto);
  }
}
