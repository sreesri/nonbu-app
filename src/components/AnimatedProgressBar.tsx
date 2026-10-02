import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useTheme } from '@/lib/theme';

const SHIMMER_WIDTH = 80;

/**
 * Horizontal progress bar that eases to each new value. With `live`, a highlight sweeps
 * across the filled part so a slowly advancing bar (e.g. a 16h fast) still looks alive.
 */
export function AnimatedProgressBar({
  progress,
  color,
  live = false,
  height = 14,
}: {
  progress: number;
  color: string;
  live?: boolean;
  height?: number;
}) {
  const t = useTheme();
  const clamped = Math.min(Math.max(progress, 0), 1);
  const [fill] = useState(() => new Animated.Value(clamped));
  const [shimmer] = useState(() => new Animated.Value(0));
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    // Slightly shorter than the 1s tick so consecutive updates read as continuous motion.
    Animated.timing(fill, {
      toValue: clamped,
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [clamped, fill]);

  useEffect(() => {
    if (!live) return;
    shimmer.setValue(0);
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [live, shimmer]);

  return (
    <View
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      style={{ height, borderRadius: height / 2, backgroundColor: t.progress.track, overflow: 'hidden' }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
          overflow: 'hidden',
          width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      >
        {live && trackWidth ? (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: SHIMMER_WIDTH,
              backgroundColor: t.progress.shimmer,
              transform: [
                {
                  translateX: shimmer.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-SHIMMER_WIDTH, trackWidth],
                  }),
                },
              ],
            }}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}
