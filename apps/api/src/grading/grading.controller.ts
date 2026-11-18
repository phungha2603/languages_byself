import { Body, Controller, Post } from "@nestjs/common";
import { GradingService } from "./grading.service";
import { GradeWritingDto } from "./dto/grade-writing.dto";
import { GradeSpeakingDto } from "./dto/grade-speaking.dto";

/** Standalone grading — not tied to a seeded Exercise or persisted as an attempt. */
@Controller("grading")
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Post("writing")
  gradeWriting(@Body() dto: GradeWritingDto) {
    return this.gradingService.gradeWriting(dto);
  }

  @Post("speaking")
  gradeSpeaking(@Body() dto: GradeSpeakingDto) {
    return this.gradingService.gradeSpeaking(dto);
  }
}
