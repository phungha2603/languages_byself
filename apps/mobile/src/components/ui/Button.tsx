import { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';
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
  size?: 'sm' | 'md' | 'lg';
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
  const scale = useRef(new Animated.Value(1)).current;

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

  function animateTo(toValue: number) {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  }

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => !isDisabled && animateTo(0.95)}
      onPressOut={() => animateTo(1)}>
      <Animated.View
        style={[
          styles.base,
          size === 'lg' ? styles.lg : size === 'sm' ? styles.sm : styles.md,
          fullWidth && styles.fullWidth,
          { backgroundColor: variantStyle.backgroundColor, transform: [{ scale }] },
          variant === 'outline' && { borderWidth: 1.5, borderColor: variantStyle.borderColor },
          isDisabled && styles.disabled,
        ]}>
        {loading ? (
          <ActivityIndicator color={variantStyle.textColor} />
        ) : (
          <>
            {icon && iconPosition === 'left' && <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={variantStyle.textColor} />}
            <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: variantStyle.textColor }]}>{label}</Text>
            {icon && iconPosition === 'right' && <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={variantStyle.textColor} />}
          </>
        )}
      </Animated.View>
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
  sm: { paddingVertical: 7, paddingHorizontal: spacing.md, gap: 4 },
  md: { paddingVertical: 12, paddingHorizontal: spacing.xl },
  lg: { paddingVertical: 16, paddingHorizontal: spacing.xxl },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fontFamily.semibold, fontSize: 15 },
  labelSm: { fontSize: 12.5 },
});
