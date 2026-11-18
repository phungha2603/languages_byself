import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily, radii, spacing } from '@/src/theme';

interface BadgeProps {
  label: string;
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'soft' | 'solid';
}

export function Badge({ label, color, icon, variant = 'soft' }: BadgeProps) {
  const isSolid = variant === 'solid';
  return (
    <View style={[styles.badge, { backgroundColor: isSolid ? color : `${color}1F` }]}>
      {icon && <Ionicons name={icon} size={12} color={isSolid ? '#fff' : color} />}
      <Text style={[styles.label, { color: isSolid ? '#fff' : color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  label: { fontFamily: fontFamily.semibold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
});
