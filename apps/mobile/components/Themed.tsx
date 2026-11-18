/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */
import type { ComponentProps } from 'react';
import { Text as DefaultText, View as DefaultView } from 'react-native';

import { fontFamily, useTheme } from '@/src/theme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & ComponentProps<typeof DefaultText>;
export type ViewProps = ThemeProps & ComponentProps<typeof DefaultView>;

/**
 * Resolves against the same `useTheme()` source as the rest of the app (which reads the
 * real OS/browser color scheme) so Themed components never disagree with the design system
 * about whether the app is in light or dark mode.
 */
export function useThemeColor(props: { light?: string; dark?: string }, colorName: 'text' | 'background') {
  const { colors, isDark } = useTheme();
  const override = isDark ? props.dark : props.light;
  if (override) return override;
  return colorName === 'text' ? colors.textPrimary : colors.background;
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultText style={[{ color, fontFamily: fontFamily.regular }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
