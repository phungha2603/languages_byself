export const palette = {
  violet50: '#F5F3FF',
  violet100: '#EDE9FE',
  violet200: '#DDD6FE',
  violet400: '#A78BFA',
  violet500: '#8B5CF6',
  violet600: '#7C3AED',
  violet700: '#6D28D9',
  violet900: '#2E1065',

  sky400: '#38BDF8',
  sky500: '#0EA5E9',
  sky600: '#0284C7',

  orange400: '#FB923C',
  orange500: '#F97316',
  orange600: '#EA580C',

  emerald400: '#34D399',
  emerald500: '#10B981',
  emerald600: '#059669',

  pink400: '#F472B6',
  pink500: '#EC4899',
  pink600: '#DB2777',

  amber400: '#FBBF24',
  amber500: '#F59E0B',

  rose400: '#FB7185',
  rose500: '#F43F5E',
  rose600: '#E11D48',

  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  slate950: '#070B16',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Per-skill accent colors — used consistently on Dashboard, Practice, and SRS. */
export const skillColors = {
  listening: palette.sky500,
  speaking: palette.orange500,
  reading: palette.emerald500,
  writing: palette.pink500,
} as const;

export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  shadow: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export const lightColors: ThemeColors = {
  background: palette.slate50,
  backgroundAlt: palette.violet50,
  surface: palette.white,
  surfaceAlt: palette.slate100,
  border: palette.slate200,
  textPrimary: palette.slate900,
  textSecondary: palette.slate500,
  textOnPrimary: palette.white,
  primary: palette.violet600,
  primaryPressed: palette.violet700,
  primarySoft: palette.violet100,
  success: palette.emerald500,
  successSoft: '#DCFCE7',
  warning: palette.amber500,
  warningSoft: '#FEF3C7',
  danger: palette.rose500,
  dangerSoft: '#FFE4E6',
  info: palette.sky500,
  shadow: palette.slate900,
  tabBarActive: palette.violet600,
  tabBarInactive: palette.slate400,
};

export const darkColors: ThemeColors = {
  background: palette.slate950,
  backgroundAlt: '#140F26',
  surface: palette.slate900,
  surfaceAlt: palette.slate800,
  border: palette.slate700,
  textPrimary: palette.slate100,
  textSecondary: palette.slate400,
  textOnPrimary: palette.white,
  primary: palette.violet500,
  primaryPressed: palette.violet400,
  primarySoft: '#2E1065',
  success: palette.emerald400,
  successSoft: '#064E3B',
  warning: palette.amber400,
  warningSoft: '#451A03',
  danger: palette.rose400,
  dangerSoft: '#4C0519',
  info: palette.sky400,
  shadow: palette.black,
  tabBarActive: palette.violet400,
  tabBarInactive: palette.slate500,
};

