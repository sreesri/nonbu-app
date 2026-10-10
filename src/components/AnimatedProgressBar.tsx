import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useTheme } from '@/lib/theme';

const EASE_MS = 900;

/** Horizontal progress bar that eases to each new value. */
export function AnimatedProgressBar({
  progress,
  color,
  height = 14,
}: {
  progress: number;
  color: string;
  height?: number;
}) {
  const t = useTheme();
  const clamped = Math.min(Math.max(progress, 0), 1);
  const [fill] = useState(() => new Animated.Value(clamped));

  useEffect(() => {
    Animated.timing(fill, {
      toValue: clamped,
      duration: EASE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [clamped, fill]);

  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: t.progress.track, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
          width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}
