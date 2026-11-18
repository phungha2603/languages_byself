import { ServiceUnavailableException } from "@nestjs/common";

/** All OpenAI-backed tool services (TTS, STT, Translation) share this guard. */
export function requireOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new ServiceUnavailableException(
      "OPENAI_API_KEY is not configured. Set it in apps/api/.env to enable TTS/STT/Translation.",
    );
  }
  return key;
}
