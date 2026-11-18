import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { SttRequest, SttResult } from "@app/shared-types";
import { requireOpenAiKey } from "../openai-key.util";

interface WhisperVerboseResponse {
  text: string;
  segments?: { words?: { word: string; start: number; end: number; probability?: number }[] }[];
}

/** Speech-to-text via OpenAI's `whisper-1` model, used for speaking exercises. */
@Injectable()
export class SttService {
  async transcribe(request: SttRequest): Promise<SttResult> {
    const apiKey = requireOpenAiKey();
    const audioBuffer = await this.resolveAudio(request.audioUrl);

    const form = new FormData();
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    if (request.languageHint) form.append("language", request.languageHint);
    form.append("file", new Blob([audioBuffer]), "audio.mp3");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`OpenAI STT failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as WhisperVerboseResponse;
    const words = (data.segments ?? []).flatMap((segment) =>
      (segment.words ?? []).map((w) => ({
        word: w.word,
        startSec: w.start,
        endSec: w.end,
        confidence: w.probability ?? 1,
      })),
    );
    const confidence = words.length === 0 ? 1 : words.reduce((sum, w) => sum + w.confidence, 0) / words.length;

    return { transcript: data.text, words, confidence, provider: "openai-whisper-1" };
  }

  private async resolveAudio(audioUrl: string): Promise<Buffer> {
    if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
      const res = await fetch(audioUrl);
      return Buffer.from(await res.arrayBuffer());
    }
    const localPath = join(process.cwd(), "storage", audioUrl.replace(/^\/+/, ""));
    return readFile(localPath);
  }
}
