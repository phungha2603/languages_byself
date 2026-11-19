import Svg, { Circle, Polyline } from 'react-native-svg';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color: string;
}

/** A tiny trend line for "last N attempts" data — e.g. per-skill accuracy over time. */
export function Sparkline({ data, width = 56, height = 18, color }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(' ');
  const lastX = (data.length - 1) * step;
  const lastY = height - ((data[data.length - 1]! - min) / range) * height;

  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={lastX} cy={lastY} r={2} fill={color} />
    </Svg>
  );
}
