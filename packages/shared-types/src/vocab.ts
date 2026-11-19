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
  /** Groups the word into a flashcard deck within its level, e.g. "Family & People". */
  topic?: string;
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

/** A word deck grouped by topic within one CEFR level. */
export interface VocabTopicGroup {
  topic: string;
  totalWords: number;
  /** How many of this topic's words the requesting user has reviewed at least once. */
  masteredWords: number;
  words: VocabItem[];
}

/** A stage's vocabulary mastery % at or above this unlocks the next stage's vocab bank. */
export const VOCAB_UNLOCK_THRESHOLD = 70;

export type VocabLevelStatus = "locked" | "unlocked" | "completed";

export interface VocabLevelProgress {
  stageId: string;
  cefrLevel: CefrLevel;
  stageLabel: string;
  totalWords: number;
  masteredWords: number;
  masteryPercent: number;
  status: VocabLevelStatus;
}

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
