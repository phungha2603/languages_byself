export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export interface VocabItem {
  id: string;
  headword: string;
  ipa?: string;
  partOfSpeech?: string;
  definitions: string[];
  translations: Record<string, string>;
  examples: string[];
  cefrLevel?: CefrLevel;
  audioUrl?: string;
  /** Which IELTS stage(s) this word is curated for. */
  stageIds: string[];
}

/**
 * Each IELTS roadmap stage's curated vocabulary bank targets one CEFR level, so a user
 * reviewing vocabulary "for their target band" lands on exactly this level by default.
 */
export const CEFR_LEVEL_BY_STAGE: Record<string, CefrLevel> = {
  foundation: "A1",
  "band-4-5": "A2",
  "band-5-6": "B1",
  "band-6-7": "B2",
  "band-7-8": "C1",
};

export interface DictionaryLookupResult {
  query: string;
  found: boolean;
  entries: VocabItem[];
  source: "cache" | "provider";
}

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslationResult {
  text: string;
  sourceLang: string;
  targetLang: string;
  translatedText: string;
  provider: string;
}
