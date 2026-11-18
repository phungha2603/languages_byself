import { Body, Controller, Post } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";
import { SttService } from "./stt.service";

class TranscribeDto {
  @IsString()
  audioUrl!: string;

  @IsOptional()
  @IsString()
  languageHint?: string;
}

@Controller("tools/stt")
export class SttController {
  constructor(private readonly sttService: SttService) {}

  @Post()
  transcribe(@Body() dto: TranscribeDto) {
    return this.sttService.transcribe(dto);
  }
}
