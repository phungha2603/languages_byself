import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, fontFamily, spacing } from '@/src/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  textCol: { flex: 1, gap: 2 },
  title: { fontFamily: fontFamily.display, fontSize: 26 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 14 },
});
