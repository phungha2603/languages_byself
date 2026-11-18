import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme, cardShadow, radii, spacing } from '@/src/theme';

interface CardProps extends ViewProps {
  accentColor?: string;
  padded?: boolean;
}

/** The base surface used for every grouped block of content in the app. */
export function Card({ children, style, accentColor, padded = true, ...rest }: PropsWithChildren<CardProps>) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        cardShadow(isDark && accentColor ? accentColor : colors.shadow, isDark),
        { backgroundColor: colors.surface, borderColor: colors.border },
        accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null,
        padded && styles.padded,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  padded: {
    padding: spacing.lg,
  },
});
