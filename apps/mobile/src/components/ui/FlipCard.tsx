import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface FlipCardProps {
  /** true shows `back`, false shows `front`. Animates between them on change. */
  flipped: boolean;
  front: ReactNode;
  back: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * A true 3D card flip (rotateY + perspective, each face `backfaceVisibility: 'hidden'`) rather
 * than a scale/squash illusion — used by the SRS review flashcard and the Vocabulary tab's
 * topic flashcard sessions so both feel like the same physical object turning over.
 */
export function FlipCard({ flipped, front, back, style }: FlipCardProps) {
  const progress = useRef(new Animated.Value(flipped ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: flipped ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 9,
    }).start();
  }, [flipped, progress]);

  const frontRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <Animated.View style={[styles.wrapper, style]}>
      <Animated.View
        style={[styles.face, { transform: [{ perspective: 1200 }, { rotateY: frontRotate }] }]}
        pointerEvents={flipped ? 'none' : 'auto'}>
        {front}
      </Animated.View>
      <Animated.View
        style={[styles.face, styles.back, { transform: [{ perspective: 1200 }, { rotateY: backRotate }] }]}
        pointerEvents={flipped ? 'auto' : 'none'}>
        {back}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  face: { width: '100%', backfaceVisibility: 'hidden' },
  back: { position: 'absolute', top: 0, left: 0 },
});
