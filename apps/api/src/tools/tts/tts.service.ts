import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { TtsRequest, TtsResult } from "@app/shared-types";
import { requireOpenAiKey } from "../openai-key.util";

const AUDIO_DIR = join(process.cwd(), "storage", "audio");

/**
 * Text-to-speech via OpenAI's `tts-1` model. Generated clips are written to
 * local disk and served from /audio — swap for S3/R2 + a CDN URL in
 * production (see docs/ARCHITECTURE.md).
 */
@Injectable()
export class TtsService {
  async synthesize(request: TtsRequest): Promise<TtsResult> {
    const apiKey = requireOpenAiKey();

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tts-1",
        voice: request.voice ?? "alloy",
        input: request.text,
        speed: request.speed ?? 1.0,
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`OpenAI TTS failed: ${response.status} ${await response.text()}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await mkdir(AUDIO_DIR, { recursive: true });
    const filename = `${randomUUID()}.mp3`;
    await writeFile(join(AUDIO_DIR, filename), buffer);

    const wordsPerSecond = 2.5;
    const estimatedDurationSec = Math.max(1, request.text.split(/\s+/).length / wordsPerSecond / (request.speed ?? 1));

    return { audioUrl: `/audio/${filename}`, durationSec: Math.round(estimatedDurationSec), provider: "openai-tts-1" };
  }
}
