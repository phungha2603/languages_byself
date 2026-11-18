export interface VocabItem {
  id: string;
  headword: string;
  ipa?: string;
  partOfSpeech?: string;
  definitions: string[];
  translations: Record<string, string>;
  examples: string[];
  cefrLevel?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  audioUrl?: string;
  /** Which IELTS stage(s) this word is curated for. */
  stageIds: string[];
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
