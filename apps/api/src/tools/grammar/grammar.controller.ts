import { Body, Controller, Post } from "@nestjs/common";
import { IsString } from "class-validator";
import { GrammarService } from "./grammar.service";

class CheckGrammarDto {
  @IsString()
  text!: string;
}

@Controller("tools/grammar")
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @Post("check")
  check(@Body() dto: CheckGrammarDto) {
    return this.grammarService.check(dto.text);
  }
}
