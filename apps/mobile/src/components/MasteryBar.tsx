import { StyleSheet, View as RNView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Themed';
import { fontFamily, spacing, useTheme } from '@/src/theme';

interface MasteryBarProps {
  label: string;
  value: number;
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function MasteryBar({ label, value, color, icon }: MasteryBarProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <RNView style={styles.row}>
      {icon && (
        <RNView style={[styles.iconDot, { backgroundColor: `${color}1F` }]}>
          <Ionicons name={icon} size={14} color={color} />
        </RNView>
      )}
      <Text style={styles.label}>{label}</Text>
      <RNView style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
        <RNView style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
      </RNView>
      <Text style={[styles.value, { color }]}>{clamped}%</Text>
    </RNView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 6, gap: spacing.sm },
  iconDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  label: { width: 72, fontFamily: fontFamily.medium, fontSize: 13, textTransform: 'capitalize' },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  value: { width: 40, textAlign: 'right', fontFamily: fontFamily.semibold, fontSize: 13 },
});
