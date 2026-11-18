export interface TtsRequest {
  text: string;
  voice?: string;
  /** 0.25-4.0, mirrors common TTS provider speed ranges. */
  speed?: number;
  accent?: "en-US" | "en-GB" | "en-AU";
}

export interface TtsResult {
  audioUrl: string;
  durationSec: number;
  provider: string;
}

export interface SttRequest {
  audioUrl: string;
  languageHint?: string;
}

export interface SttWord {
  word: string;
  startSec: number;
  endSec: number;
  confidence: number;
}

export interface SttResult {
  transcript: string;
  words: SttWord[];
  confidence: number;
  provider: string;
}

export type GrammarIssueCategory =
  | "verb_tense"
  | "subject_verb_agreement"
  | "article_usage"
  | "preposition"
  | "word_order"
  | "punctuation"
  | "spelling"
  | "other";

export interface GrammarIssue {
  offset: number;
  length: number;
  category: GrammarIssueCategory;
  message: string;
  suggestions: string[];
}

export interface GrammarCheckRequest {
  text: string;
}

export interface GrammarCheckResult {
  text: string;
  issues: GrammarIssue[];
  provider: string;
}
