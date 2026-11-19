import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CelebrationBadgeProps {
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: number;
}

/** A spring-scaled checkmark with a looping pulse ring — shown when a topic or level is completed. */
export function CelebrationBadge({ color, icon = 'checkmark', size = 84 }: CelebrationBadgeProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.7)).current;
  const ringOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 10, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(ringScale, { toValue: 1.7, duration: 1400, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      ringScale.setValue(0.7);
      ringOpacity.setValue(0.5);
    };
  }, [color, ringOpacity, ringScale]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2, borderColor: color, opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          { width: size * 0.78, height: size * 0.78, borderRadius: (size * 0.78) / 2, backgroundColor: `${color}22`, transform: [{ scale }] },
        ]}>
        <Ionicons name={icon} size={size * 0.4} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 2 },
  circle: { alignItems: 'center', justifyContent: 'center' },
});
