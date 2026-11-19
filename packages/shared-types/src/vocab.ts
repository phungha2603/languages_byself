export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/**
 * The Vocabulary tab's own 4-level progression (B1 -> C2). It's intentionally decoupled from
 * the main IELTS roadmap's 5 stages: a learner starts at whichever level matches the IELTS band
 * they're aiming for, not necessarily at the bottom, so these band ranges don't need to line up
 * with the roadmap's stage boundaries.
 */
export const VOCAB_LEVELS = ["B1", "B2", "C1", "C2"] as const;
export type VocabCefrLevel = (typeof VOCAB_LEVELS)[number];

export interface VocabLevel {
  id: string;
  order: number;
  cefrLevel: VocabCefrLevel;
  minBand: number;
  maxBand: number;
  bandLabel: string;
  /** This level's chapter in the overall narrative, e.g. "Part I — The Trailhead". */
  storyTitle: string;
  description: string;
}

export interface VocabItem {
  id: string;
  headword: string;
  ipa?: string;
  partOfSpeech?: string;
  definitions: string[];
  translations: Record<string, string>;
  examples: string[];
  cefrLevel?: CefrLevel;
  /** Groups the word into a flashcard deck within its level, e.g. "Base Camp Supplies". */
  chapter?: string;
  chapterOrder: number;
  wordOrder: number;
  audioUrl?: string;
  vocabLevelId?: string;
}

/** A word deck grouped by chapter within one VocabLevel, ordered easy -> hard. */
export interface VocabChapterGroup {
  chapter: string;
  chapterOrder: number;
  totalWords: number;
  /** How many of this chapter's words the requesting user has reviewed at least once. */
  masteredWords: number;
  words: VocabItem[];
}

/** A level's vocabulary mastery % at or above this unlocks the next level's vocab bank. */
export const VOCAB_UNLOCK_THRESHOLD = 70;

export type VocabLevelStatus = "locked" | "unlocked" | "completed";

export interface VocabLevelProgress {
  levelId: string;
  cefrLevel: VocabCefrLevel;
  bandLabel: string;
  storyTitle: string;
  totalWords: number;
  masteredWords: number;
  masteryPercent: number;
  status: VocabLevelStatus;
  /** True for the single level matching the user's current target band — their default starting point. */
  isAnchor: boolean;
}

/**
 * Maps an IELTS target band to the VocabLevel whose range it falls in (the floor of the
 * highest level at or below the band), so a learner lands on vocabulary matched to the band
 * they're working toward rather than always starting from the bottom.
 */
export function resolveAnchorVocabLevel<T extends { order: number; minBand: number }>(
  levels: readonly T[],
  targetBand: number | null | undefined,
): T | undefined {
  if (levels.length === 0) return undefined;
  const sorted = [...levels].sort((a, b) => a.order - b.order);
  if (targetBand == null) return sorted[0];
  let anchor = sorted[0];
  for (const level of sorted) {
    if (level.minBand <= targetBand) anchor = level;
  }
  return anchor;
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
