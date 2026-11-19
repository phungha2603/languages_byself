import { useId } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';
import type { VocabCefrLevel } from '@app/shared-types';

import { View } from '@/components/Themed';

const VIEW_W = 400;
const VIEW_H = 800;

interface SceneSpec {
  skyTop: string;
  skyBottom: string;
  ground: string;
}

const SCENE_SKY: Record<VocabCefrLevel, SceneSpec> = {
  B1: { skyTop: '#FEF9C3', skyBottom: '#BBF7D0', ground: '#15803D' },
  B2: { skyTop: '#E0F2FE', skyBottom: '#7DD3FC', ground: '#334155' },
  C1: { skyTop: '#312E81', skyBottom: '#7C3AED', ground: '#1E1B4B' },
  C2: { skyTop: '#4C0519', skyBottom: '#FB923C', ground: '#881337' },
};

/** A simple two-triangle camp tent, used as B1/C1's signature decoration. */
function Tent({ x, y, size, fill }: { x: number; y: number; size: number; fill: string }) {
  return (
    <>
      <Polygon points={`${x},${y - size} ${x - size * 0.8},${y} ${x},${y}`} fill={fill} />
      <Polygon points={`${x},${y - size} ${x},${y} ${x + size * 0.8},${y}`} fill={fill} opacity={0.75} />
    </>
  );
}

/** A flag on a pole — marks the B1 trailhead sign-post and the C2 summit. */
function Flag({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <>
      <Rect x={x} y={y - 46} width={2.5} height={46} fill="#E2E8F0" />
      <Polygon points={`${x + 2.5},${y - 46} ${x + 24},${y - 38} ${x + 2.5},${y - 30}`} fill={color} />
    </>
  );
}

function sceneDecor(level: VocabCefrLevel, gradId: string) {
  switch (level) {
    case 'B1':
      return (
        <>
          <Rect x={0} y={640} width={VIEW_W} height={160} fill="#16A34A" />
          <Polygon points="0,500 90,440 180,470 270,420 360,460 400,440 400,660 0,660" fill="#4ADE80" opacity={0.55} />
          <Polygon points="0,580 110,510 230,560 330,500 400,540 400,660 0,660" fill="#22C55E" />
          <Tent x={300} y={635} size={46} fill="#B45309" />
          <Flag x={70} y={630} color="#15803D" />
          <Circle cx={320} cy={120} r={26} fill="#FEF3C7" opacity={0.9} />
        </>
      );
    case 'B2':
      return (
        <>
          <Rect x={0} y={640} width={VIEW_W} height={160} fill="#475569" />
          <Polygon points="0,420 70,330 150,400 230,300 310,380 400,320 400,660 0,660" fill="#7DD3FC" opacity={0.5} />
          <Polygon points="0,540 100,440 210,500 300,420 400,480 400,660 0,660" fill="#0284C7" />
          {/* Lodge */}
          <Rect x={70} y={580} width={90} height={60} fill="#1E293B" />
          <Polygon points="60,580 115,540 170,580" fill="#0F172A" />
          <Rect x={150} y={520} width={8} height={24} fill="#1E293B" />
          <Circle cx={158} cy={508} r={9} fill="#E2E8F0" opacity={0.6} />
          <Circle cx={168} cy={492} r={11} fill="#E2E8F0" opacity={0.4} />
        </>
      );
    case 'C1':
      return (
        <>
          <Rect x={0} y={640} width={VIEW_W} height={160} fill="#1E1B4B" />
          <Polygon points="0,380 60,260 130,340 200,220 260,320 340,240 400,300 400,660 0,660" fill="#A78BFA" opacity={0.4} />
          <Polygon points="0,500 90,370 180,460 270,350 360,440 400,400 400,660 0,660" fill="#6D28D9" />
          <Rect x={0} y={470} width={VIEW_W} height={60} fill="#E0E7FF" opacity={0.18} />
          <Tent x={90} y={640} size={38} fill="#4C1D95" />
          <Tent x={150} y={645} size={30} fill="#5B21B6" />
          <Circle cx={92} cy={615} r={4} fill="#FDE68A" opacity={0.9} />
          <Circle cx={150} cy={622} r={3.5} fill="#FDE68A" opacity={0.9} />
        </>
      );
    case 'C2':
      return (
        <>
          <Rect x={0} y={640} width={VIEW_W} height={160} fill="#9F1239" />
          <Circle cx={330} cy={560} r={70} fill="#FDBA74" opacity={0.3} />
          <Circle cx={330} cy={560} r={42} fill="#FB923C" />
          {[...Array(6)].map((_, i) => (
            <Circle key={i} cx={30 + i * 65} cy={70 + (i % 3) * 40} r={2} fill="#FFFFFF" opacity={0.7} />
          ))}
          <Polygon points="130,660 230,150 330,660" fill="#881337" />
          <Polygon points="130,660 230,150 180,660" fill="#9F1239" opacity={0.7} />
          <Polygon points="230,150 205,205 255,205" fill="#FFFFFF" opacity={0.92} />
          <Flag x={230} y={150} color="#FDE68A" />
        </>
      );
    default:
      return null;
  }
}

interface LevelSceneProps {
  cefrLevel: VocabCefrLevel;
  style?: StyleProp<ViewStyle>;
}

/**
 * A distinct stylised "3D" backdrop per vocabulary band — the story's 4 camps rendered as actual
 * scenery (sky, layered mountains, a signature landmark) rather than just a colour. Pure
 * react-native-svg, no extra dependency; used both behind the level summary and behind flashcards
 * for that level, so studying B1 always *feels* like the trailhead and C2 like the summit.
 */
export function LevelScene({ cefrLevel, style }: LevelSceneProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `sky-${rawId}`;
  const sky = SCENE_SKY[cefrLevel];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky.skyTop} />
            <Stop offset="1" stopColor={sky.skyBottom} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={`url(#${gradId})`} />
        {sceneDecor(cefrLevel, gradId)}
      </Svg>
    </View>
  );
}
