import type { VocabCefrLevel } from '@app/shared-types';
import { palette } from './colors';

/** A distinct accent color per vocabulary level, used across the Vocabulary tab's pills, chapter cards and flashcards. */
export const vocabLevelColors: Record<VocabCefrLevel, string> = {
  B1: palette.emerald500,
  B2: palette.sky500,
  C1: palette.violet500,
  C2: palette.rose500,
};
