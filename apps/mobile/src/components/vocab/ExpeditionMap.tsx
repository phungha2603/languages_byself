import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { VocabCefrLevel, VocabLevelProgress } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { fontFamily, palette, useTheme } from '@/src/theme';
import { vocabLevelColors } from '@/src/theme/vocabLevelColors';

const VIEW_W = 400;
const VIEW_H = 210;
const GROUND_Y = 172;

/** One mountain per level, left -> right, each taller than the last — the climb gets harder. */
const PEAKS: Record<VocabCefrLevel, { cx: number; apexY: number; halfBase: number }> = {
  B1: { cx: 55, apexY: 118, halfBase: 48 },
  B2: { cx: 170, apexY: 92, halfBase: 52 },
  C1: { cx: 280, apexY: 62, halfBase: 56 },
  C2: { cx: 365, apexY: 30, halfBase: 48 },
};

/** Lighter "sunlit" shade per level, for the left face of its mountain. */
const LIT_SHADE: Record<VocabCefrLevel, string> = {
  B1: palette.emerald400,
  B2: palette.sky400,
  C1: palette.violet400,
  C2: palette.rose400,
};

/** `"Part I — The Trailhead"` -> `"The Trailhead"` */
function storyLabel(storyTitle: string): string {
  const parts = storyTitle.split('—');
  return parts.length > 1 ? parts[1]!.trim() : storyTitle;
}

interface ExpeditionMapProps {
  progress: VocabLevelProgress[];
  selectedLevelId: string | null;
  onSelectLevel: (entry: VocabLevelProgress) => void;
  onLockedPress: () => void;
}

/**
 * The Vocabulary tab's hero: the 4 CEFR levels as one continuous mountain expedition, rendered as
 * a stylised isometric range (react-native-svg — no 3D engine, no extra native dependency, same
 * on web and native). Replaces the old flat level-pill row as the level picker.
 */
export function ExpeditionMap({ progress, selectedLevelId, onSelectLevel, onLockedPress }: ExpeditionMapProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none">
        <Path
          d={`M10,${GROUND_Y} Q95,${GROUND_Y - 10} 180,${GROUND_Y} T350,${GROUND_Y} T390,${GROUND_Y}`}
          stroke={colors.textSecondary}
          strokeWidth={2}
          strokeDasharray="6 10"
          fill="none"
          opacity={0.55}
        />

        {progress.map((entry) => {
          const peak = PEAKS[entry.cefrLevel];
          if (!peak) return null;
          const locked = entry.status === 'locked';
          const litColor = locked ? palette.slate300 : LIT_SHADE[entry.cefrLevel];
          const shadeColor = locked ? palette.slate400 : vocabLevelColors[entry.cefrLevel];
          const { cx, apexY, halfBase } = peak;

          return (
            <Polygons
              key={entry.levelId}
              cx={cx}
              apexY={apexY}
              halfBase={halfBase}
              litColor={litColor}
              shadeColor={shadeColor}
              snowCapped={entry.status === 'completed'}
            />
          );
        })}
      </Svg>

      {progress.map((entry) => {
        const peak = PEAKS[entry.cefrLevel];
        if (!peak) return null;
        const selected = entry.levelId === selectedLevelId;
        const locked = entry.status === 'locked';
        const levelColor = vocabLevelColors[entry.cefrLevel];
        const leftPct = (peak.cx / VIEW_W) * 100;

        return (
          <View key={entry.levelId} style={[styles.markerColumn, { left: `${leftPct}%` }]}>
            {entry.isAnchor && (
              <View style={[styles.anchorFlag, { backgroundColor: levelColor }]}>
                <Ionicons name="flag" size={10} color={colors.textOnPrimary} />
              </View>
            )}
            <Pressable onPress={() => (locked ? onLockedPress() : onSelectLevel(entry))} hitSlop={8}>
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: locked ? colors.surfaceAlt : levelColor,
                    borderColor: selected ? colors.textPrimary : 'transparent',
                    opacity: locked ? 0.7 : 1,
                  },
                ]}>
                <Ionicons
                  name={locked ? 'lock-closed' : entry.status === 'completed' ? 'checkmark' : 'trail-sign'}
                  size={16}
                  color={locked ? colors.textSecondary : colors.textOnPrimary}
                />
              </View>
            </Pressable>
            <Text
              numberOfLines={2}
              style={[
                styles.markerLabel,
                { color: selected ? colors.textPrimary : colors.textSecondary, fontFamily: selected ? fontFamily.bold : fontFamily.medium },
              ]}>
              {storyLabel(entry.storyTitle)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** The two flat-shaded triangle faces that make a mountain read as 3D, plus an optional snow cap. */
function Polygons({
  cx,
  apexY,
  halfBase,
  litColor,
  shadeColor,
  snowCapped,
}: {
  cx: number;
  apexY: number;
  halfBase: number;
  litColor: string;
  shadeColor: string;
  snowCapped: boolean;
}) {
  const left = cx - halfBase;
  const right = cx + halfBase;
  const capY = apexY + (GROUND_Y - apexY) * 0.22;
  const capHalf = halfBase * 0.32;

  return (
    <>
      <Polygon points={`${cx},${apexY} ${left},${GROUND_Y} ${cx},${GROUND_Y}`} fill={litColor} />
      <Polygon points={`${cx},${apexY} ${cx},${GROUND_Y} ${right},${GROUND_Y}`} fill={shadeColor} />
      {snowCapped && (
        <Polygon
          points={`${cx},${apexY} ${cx - capHalf},${capY} ${cx + capHalf},${capY}`}
          fill={palette.white}
          opacity={0.92}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: VIEW_H + 48, position: 'relative' },
  markerColumn: {
    position: 'absolute',
    top: GROUND_Y - 14,
    alignItems: 'center',
    width: 78,
    marginLeft: -39,
    gap: 4,
    backgroundColor: 'transparent',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  anchorFlag: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
  },
  markerLabel: { fontSize: 10.5, textAlign: 'center', lineHeight: 13 },
});
