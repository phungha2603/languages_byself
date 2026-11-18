import { Body, Controller, Post } from "@nestjs/common";
import { IsString } from "class-validator";
import { TranslationService } from "./translation.service";

class TranslateDto {
  @IsString()
  text!: string;

  @IsString()
  sourceLang!: string;

  @IsString()
  targetLang!: string;
}

@Controller("tools/translation")
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post()
  translate(@Body() dto: TranslateDto) {
    return this.translationService.translate(dto);
  }
}
