import { Controller, Get, Query } from "@nestjs/common";
import { DictionaryService } from "./dictionary.service";

@Controller("tools/dictionary")
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get()
  lookup(@Query("word") word: string) {
    return this.dictionaryService.lookup(word);
  }
}
