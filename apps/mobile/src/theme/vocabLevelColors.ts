import type { CefrLevel } from '@app/shared-types';
import { palette } from './colors';

/** A distinct accent color per CEFR level, used across the Vocabulary tab's pills, topic cards and flashcards. */
export const vocabLevelColors: Record<CefrLevel, string> = {
  A1: palette.emerald500,
  A2: palette.sky500,
  B1: palette.violet500,
  B2: palette.orange500,
  C1: palette.pink500,
  C2: palette.rose500,
};
