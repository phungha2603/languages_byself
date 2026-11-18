import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { TranslationRequest, TranslationResult } from "@app/shared-types";
import { requireOpenAiKey } from "../openai-key.util";

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

/**
 * Translation via an OpenAI chat-completion prompt. Swap for DeepL/Google
 * Translate by implementing the same `translate` signature if you need
 * higher-volume, lower-latency translation later.
 */
@Injectable()
export class TranslationService {
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const apiKey = requireOpenAiKey();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `Translate the user's text from ${request.sourceLang} to ${request.targetLang}. Reply with only the translation, no explanation.`,
          },
          { role: "user", content: request.text },
        ],
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(`OpenAI translation failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const translatedText = data.choices[0]?.message.content.trim() ?? "";

    return {
      text: request.text,
      sourceLang: request.sourceLang,
      targetLang: request.targetLang,
      translatedText,
      provider: "openai-gpt-4o-mini",
    };
  }
}
