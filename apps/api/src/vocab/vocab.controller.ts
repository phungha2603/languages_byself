import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { VocabService } from "./vocab.service";

@Controller("vocab")
export class VocabController {
  constructor(private readonly vocabService: VocabService) {}

  /** Public reference data — the word bank for one IELTS stage / CEFR level. */
  @Get()
  listByStage(@Query("stageId") stageId?: string) {
    if (!stageId) throw new BadRequestException("stageId query param is required");
    return this.vocabService.listByStage(stageId);
  }
}
