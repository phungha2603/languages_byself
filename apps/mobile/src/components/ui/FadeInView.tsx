import { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

interface FadeInViewProps {
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** A gentle fade + rise entrance, used to stagger list items (topics, flashcard results) in on mount. */
export function FadeInView({ children, delay = 0, style }: PropsWithChildren<FadeInViewProps>) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}
