import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { radii } from '@/src/theme';

interface AnimatedProgressBarProps {
  value: number;
  color: string;
  trackColor: string;
  height?: number;
}

/** A progress bar whose fill eases to its new width instead of snapping — used anywhere mastery % changes. */
export function AnimatedProgressBar({ value, color, trackColor, height = 6 }: AnimatedProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const widthAnim = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: clamped, duration: 600, useNativeDriver: false }).start();
  }, [clamped, widthAnim]);

  return (
    <Animated.View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: radii.pill },
  fill: { borderRadius: radii.pill },
});
