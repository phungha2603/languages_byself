import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import type {
  GradingResult,
  Mistake,
  MistakeCategory,
  SpeakingGradingRequest,
  WritingGradingRequest,
} from "@app/shared-types";
import { SPEAKING_CRITERIA, WRITING_CRITERIA_BY_TASK } from "@app/shared-types";
import { requireOpenAiKey } from "../tools/openai-key.util";
import { buildSpeakingRubricPrompt, buildWritingRubricPrompt } from "./rubrics";

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

interface RawGraderOutput {
  criteria: { criterion: string; band: number; rationale: string }[];
  feedback: string;
  mistakes: { category: string; detail: string; grammarTopic?: string }[];
}

const GRADING_MODEL = process.env.GRADING_MODEL ?? "gpt-4o-mini";
const MISTAKE_CATEGORIES: MistakeCategory[] = [
  "grammar",
  "vocabulary",
  "pronunciation",
  "comprehension",
  "fluency",
  "task_response",
];

/** Official IELTS rounding: average of 4 criteria, .25 rounds up to .5, .75 rounds up to the next whole band. */
export function roundToIeltsBand(average: number): number {
  return Math.round(average * 2) / 2;
}

function clampBand(band: number): number {
  return Math.min(9, Math.max(0, Math.round(band * 2) / 2));
}

/**
 * Grades Writing and Speaking responses against IELTS's 4-criteria rubric
 * using an LLM judge grounded in the band descriptors in `rubrics.ts`. This
 * is a practice-test aid, not an official IELTS score — band estimates from
 * LLM judges are useful for self-study feedback but should not be treated as
 * exam-equivalent without separate calibration against real examiner scores.
 */
@Injectable()
export class GradingService {
  private readonly logger = new Logger(GradingService.name);

  async gradeWriting(request: WritingGradingRequest): Promise<GradingResult> {
    const criteriaNames = WRITING_CRITERIA_BY_TASK[request.taskType];
    const system = this.buildSystemPrompt(
      `You are an IELTS Writing examiner grading a ${request.taskType === "task1" ? "Task 1 (report/letter)" : "Task 2 (essay)"} response.`,
      buildWritingRubricPrompt(request.taskType),
      criteriaNames,
    );
    const user = `Task prompt:\n${request.prompt}\n\nCandidate's response:\n${request.essay}`;
    return this.runGrader(system, user, criteriaNames);
  }

  async gradeSpeaking(request: SpeakingGradingRequest): Promise<GradingResult> {
    const system = this.buildSystemPrompt(
      `You are an IELTS Speaking examiner grading a ${request.part} response, transcribed from audio.`,
      buildSpeakingRubricPrompt(),
      SPEAKING_CRITERIA,
    );
    const user = `Question/cue card:\n${request.prompt}\n\nCandidate's transcript:\n${request.transcript}\n\nNote: this is a text transcript — do not invent pronunciation detail you cannot infer from the words themselves (disfluency markers, repetition, self-correction are visible in the transcript and are valid evidence for Fluency and Coherence).`;
    return this.runGrader(system, user, SPEAKING_CRITERIA);
  }

  private buildSystemPrompt(role: string, rubric: string, criteria: readonly string[]): string {
    return [
      role,
      "Score strictly against the band descriptors below — do not be lenient. Each criterion is scored independently on a 0-9 scale in 0.5 steps.",
      rubric,
      "",
      `Criteria to score, in this exact order: ${criteria.join(", ")}.`,
      "Also extract concrete mistakes (grammar, vocabulary, or task-response issues) the candidate made, each tagged with a category and — for grammar mistakes — a short topic label (e.g. 'present_perfect', 'article_usage', 'subject_verb_agreement') suitable for tracking recurring weaknesses over time.",
      'Respond with ONLY a JSON object of this exact shape: {"criteria": [{"criterion": string, "band": number, "rationale": string}], "feedback": string, "mistakes": [{"category": "grammar"|"vocabulary"|"pronunciation"|"comprehension"|"fluency"|"task_response", "detail": string, "grammarTopic"?: string}]}',
    ].join("\n");
  }

  private async runGrader(system: string, user: string, criteria: readonly string[]): Promise<GradingResult> {
    const apiKey = requireOpenAiKey();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GRADING_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`OpenAI grading failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices[0]?.message.content ?? "{}";

    let parsed: RawGraderOutput;
    try {
      parsed = JSON.parse(content) as RawGraderOutput;
    } catch (err) {
      this.logger.error(`Grader returned invalid JSON: ${content}`);
      throw new InternalServerErrorException("Grader returned an unparseable response.");
    }

    const scoredCriteria = criteria.map((criterion) => {
      const match = parsed.criteria?.find((c) => c.criterion === criterion);
      return { criterion, band: clampBand(match?.band ?? 0), rationale: match?.rationale ?? "No rationale provided." };
    });

    const overallBand = roundToIeltsBand(scoredCriteria.reduce((sum, c) => sum + c.band, 0) / scoredCriteria.length);

    const mistakes: Mistake[] = (parsed.mistakes ?? [])
      .filter((m) => MISTAKE_CATEGORIES.includes(m.category as MistakeCategory))
      .map((m) => ({ category: m.category as MistakeCategory, detail: m.detail, grammarTopic: m.grammarTopic }));

    return {
      overallBand,
      criteria: scoredCriteria,
      feedback: parsed.feedback ?? "",
      mistakes,
      provider: `openai-${GRADING_MODEL}`,
    };
  }
}
