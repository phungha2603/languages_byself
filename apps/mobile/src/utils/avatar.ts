import { palette } from '@/src/theme';

const AVATAR_EMOJIS = ['🦊', '🐼', '🦁', '🐨', '🐸', '🦉', '🐯', '🐵', '🐰', '🦋', '🐳', '🦄', '🐢', '🦜', '🐙', '🦔'];

const PROFILE_GRADIENTS: readonly [string, string][] = [
  [palette.violet700, palette.violet400],
  [palette.sky600, palette.sky400],
  [palette.emerald600, palette.emerald400],
  [palette.orange600, palette.orange400],
  [palette.pink600, palette.pink400],
  [palette.rose600, palette.rose400],
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface ProfileTheme {
  emoji: string;
  gradient: readonly [string, string];
}

/**
 * A deterministic, free "avatar" derived from the user's id — no upload step, no storage
 * infra, and it's stable across sessions/devices since it's a pure function of the id.
 */
export function profileThemeFor(seed: string): ProfileTheme {
  const h = hashString(seed);
  return {
    emoji: AVATAR_EMOJIS[h % AVATAR_EMOJIS.length]!,
    gradient: PROFILE_GRADIENTS[h % PROFILE_GRADIENTS.length]!,
  };
}
