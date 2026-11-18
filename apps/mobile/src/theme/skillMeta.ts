import type { Ionicons } from '@expo/vector-icons';
import type { Skill } from '@app/shared-types';
import { skillColors } from './colors';

export const skillIcons: Record<Skill, keyof typeof Ionicons.glyphMap> = {
  listening: 'headset',
  speaking: 'mic',
  reading: 'book',
  writing: 'create',
};

export const skillMeta: Record<Skill, { color: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  listening: { color: skillColors.listening, icon: skillIcons.listening, label: 'Listening' },
  speaking: { color: skillColors.speaking, icon: skillIcons.speaking, label: 'Speaking' },
  reading: { color: skillColors.reading, icon: skillIcons.reading, label: 'Reading' },
  writing: { color: skillColors.writing, icon: skillIcons.writing, label: 'Writing' },
};
