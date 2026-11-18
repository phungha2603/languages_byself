import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily } from '@/src/theme';

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** A circular "mastery" gauge — used on the Dashboard and Practice skill cards. */
export function ProgressRing({ value, size = 72, strokeWidth = 7, color, trackColor, icon }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        {icon ? (
          <Ionicons name={icon} size={size * 0.3} color={color} />
        ) : (
          <Text style={[styles.value, { color }]}>{clamped}%</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: fontFamily.bold, fontSize: 16 },
});
