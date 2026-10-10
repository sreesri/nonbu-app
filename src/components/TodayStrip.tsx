import { addDays, startOfDay } from 'date-fns';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, Pattern, Rect } from 'react-native-svg';

import type { Session } from '@/api/types';
import { formatHours } from '@/lib/format';
import { spacing, useTheme } from '@/lib/theme';
import { todaySegments } from '@/lib/todayPlan';
import { Body, Row } from './ui';

const STRIP_HEIGHT = 22;
/** How far the "now" line reaches past the strip, above and below. */
const NOW_OVERHANG = 3;
const STRIP_RADIUS = 6;
const HATCH_SIZE = 7;
const HATCH_STROKE = 3;
const PLANNED_OPACITY = 0.45;
const AXIS_LABELS = ['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'];

/**
 * Today from midnight to midnight: time already fasted or eaten in solid color, the planned
 * rest of the day striped, and a line at now.
 */
export function TodayStrip({
  sessions,
  current,
  fastHours,
  now,
}: {
  sessions: Session[];
  current: Session | null;
  fastHours: number;
  now: number;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const dayStart = startOfDay(now).getTime();
  const dayEnd = addDays(dayStart, 1).getTime();
  const span = dayEnd - dayStart;
  const segments = todaySegments({ sessions, current, fastHours, now, dayStart, dayEnd });
  const x = (ms: number) => ((ms - dayStart) / span) * width;
  const colorOf = (kind: Session['kind']) => (kind === 'fast' ? t.fasting : t.eating);

  const doneHours = (kind: Session['kind']) =>
    segments.filter((s) => s.kind === kind && !s.planned).reduce((sum, s) => sum + (s.end - s.start), 0) / 3600_000;
  const summary = `Today so far: fasted ${formatHours(doneHours('fast'))}, eating window ${formatHours(doneHours('eat'))}`;

  return (
    <View style={{ gap: spacing.xs }}>
      <View
        accessible
        accessibilityLabel={summary}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: STRIP_HEIGHT + NOW_OVERHANG * 2 }}
      >
        {width > 0 ? (
          <Svg width={width} height={STRIP_HEIGHT + NOW_OVERHANG * 2}>
            <Defs>
              <ClipPath id="today-strip">
                <Rect x={0} y={NOW_OVERHANG} width={width} height={STRIP_HEIGHT} rx={STRIP_RADIUS} />
              </ClipPath>
              {(['fast', 'eat'] as const).map((kind) => (
                <Pattern
                  key={kind}
                  id={`today-planned-${kind}`}
                  patternUnits="userSpaceOnUse"
                  width={HATCH_SIZE}
                  height={HATCH_SIZE}
                  patternTransform="rotate(45)"
                >
                  <Rect width={HATCH_STROKE} height={HATCH_SIZE} fill={colorOf(kind)} />
                </Pattern>
              ))}
            </Defs>
            <G clipPath="url(#today-strip)">
              <Rect x={0} y={NOW_OVERHANG} width={width} height={STRIP_HEIGHT} fill={t.progress.track} />
              {segments.map((s) => (
                <Rect
                  key={`${s.kind}-${s.start}-${s.planned}`}
                  x={x(s.start)}
                  y={NOW_OVERHANG}
                  width={x(s.end) - x(s.start)}
                  height={STRIP_HEIGHT}
                  fill={s.planned ? `url(#today-planned-${s.kind})` : colorOf(s.kind)}
                  opacity={s.planned ? PLANNED_OPACITY : 1}
                />
              ))}
            </G>
            <Rect x={x(now) - 1} y={0} width={2} height={STRIP_HEIGHT + NOW_OVERHANG * 2} rx={1} fill={t.text} />
          </Svg>
        ) : null}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        {AXIS_LABELS.map((label, i) => (
          <Body key={i} muted style={{ fontSize: 12, fontVariant: ['tabular-nums'] }}>
            {label}
          </Body>
        ))}
      </Row>
      <Row style={{ gap: spacing.md, flexWrap: 'wrap' }}>
        <LegendItem color={t.fasting} label="Fasting" />
        <LegendItem color={t.eating} label="Eating" />
        <Body muted style={{ fontSize: 12 }}>
          Striped: planned
        </Body>
      </Row>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <Row style={{ gap: spacing.xs }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Body muted style={{ fontSize: 12 }}>
        {label}
      </Body>
    </Row>
  );
}
