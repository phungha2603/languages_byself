import { ActivityIndicator, Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, fontFamily, radii, spacing } from '@/src/theme';

type Variant = 'primary' | 'soft' | 'outline' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  color?: string;
  size?: 'md' | 'lg';
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  disabled,
  loading,
  fullWidth,
  color,
  size = 'md',
}: ButtonProps) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  const isDisabled = disabled || loading;

  const variantStyle = (() => {
    switch (variant) {
      case 'soft':
        return { backgroundColor: `${accent}1A`, textColor: accent };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: accent, textColor: accent };
      case 'danger':
        return { backgroundColor: colors.danger, textColor: colors.textOnPrimary };
      case 'ghost':
        return { backgroundColor: 'transparent', textColor: accent };
      case 'primary':
      default:
        return { backgroundColor: accent, textColor: colors.textOnPrimary };
    }
  })();

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        fullWidth && styles.fullWidth,
        { backgroundColor: variantStyle.backgroundColor },
        variant === 'outline' && { borderWidth: 1.5, borderColor: variantStyle.borderColor },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={variantStyle.textColor} />
      ) : (
        <>
          {icon && iconPosition === 'left' && <Ionicons name={icon} size={18} color={variantStyle.textColor} />}
          <Text style={[styles.label, { color: variantStyle.textColor }]}>{label}</Text>
          {icon && iconPosition === 'right' && <Ionicons name={icon} size={18} color={variantStyle.textColor} />}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
  },
  md: { paddingVertical: 12, paddingHorizontal: spacing.xl },
  lg: { paddingVertical: 16, paddingHorizontal: spacing.xxl },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fontFamily.semibold, fontSize: 15 },
});
