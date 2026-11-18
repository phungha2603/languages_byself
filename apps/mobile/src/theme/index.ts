import { useColorScheme } from 'react-native';
import { darkColors, lightColors, palette, skillColors, type ThemeColors } from './colors';

export { palette, skillColors };
export type { ThemeColors };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Lexend_700Bold',
  displaySemibold: 'Lexend_600SemiBold',
} as const;

/**
 * A plain black shadow is invisible against a dark background, so dark mode needs a much
 * stronger, slightly glowing shadow to read as "elevated" at all — tune opacity per mode
 * rather than using one flat value everywhere.
 */
export function cardShadow(color: string, isDark = false) {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: isDark ? 10 : 6 },
    shadowOpacity: isDark ? 0.45 : 0.08,
    shadowRadius: isDark ? 22 : 16,
    elevation: 3,
  };
}

export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? darkColors : lightColors, isDark };
}
