import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/lib/theme';

/** Space between the main ring and the overtime lap inside it. */
const LAP_GAP = 3;

export function ProgressRing({
  progress,
  size = 240,
  stroke = 16,
  color,
  overColor,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  /** Fill color; defaults to the theme's progress fill. */
  color?: string;
  /** Color of the inner lap that shows progress past 1 (overtime); defaults to the theme's over color. */
  overColor?: string;
  children?: ReactNode;
}) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(progress, 0), 1);
  // Past the goal, a second, thinner lap inside the full ring counts the overtime.
  const overtime = Math.min(Math.max(progress - 1, 0), 1);
  const lapStroke = stroke / 2;
  const lapR = r - stroke / 2 - lapStroke / 2 - LAP_GAP;
  const lapCircumference = 2 * Math.PI * lapR;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.progress.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? t.progress.fill}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {overtime > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={lapR}
            stroke={overColor ?? t.progress.over}
            strokeWidth={lapStroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${lapCircumference} ${lapCircumference}`}
            strokeDashoffset={lapCircumference * (1 - overtime)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
