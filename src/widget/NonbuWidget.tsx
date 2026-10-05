'use no memo'; // Widget trees are built by calling these functions directly, outside React.

import type { ReactElement } from 'react';
import { FlexWidget, TextWidget, type ColorProp, type WidgetRepresentation } from 'react-native-android-widget';

import { formatKcal, todayKey } from '@/lib/format';
import { radius, spacing, themes, type Theme } from '@/lib/theme';
import { ChronometerWidget } from './ChronometerWidget';
import type { WidgetSnapshot } from './snapshot';

/** Must match the widget `name` in app.json's withNonbuWidget plugin config. */
export const WIDGET_NAME = 'NonbuWidget';

const BAR_HEIGHT = 6;
const LABEL_SIZE = 12;
const VALUE_SIZE = 24;
const PLACEHOLDER = '–';
const DETAIL_SIZE = 12;

/** Theme tokens are all `#hex` or `rgba()` strings, which is what the widget renderer accepts. */
const color = (token: string) => token as ColorProp;

type Props = { snapshot: WidgetSnapshot | null; signedIn: boolean; now: number; t: Theme };

/** The widget in both color schemes; Android picks one from the system setting. */
export function renderNonbuWidget(snapshot: WidgetSnapshot | null, signedIn: boolean): WidgetRepresentation {
  const now = Date.now();
  return {
    light: <NonbuWidget snapshot={snapshot} signedIn={signedIn} now={now} t={themes.light} />,
    dark: <NonbuWidget snapshot={snapshot} signedIn={signedIn} now={now} t={themes.dark} />,
  };
}

function NonbuWidget({ snapshot, signedIn, now, t }: Props) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="Open Nonbu"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        flexGap: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: color(t.surface),
      }}
    >
      {/* The widget renderer doesn't support fragments, hence one condition per child. */}
      {snapshot ? <SessionColumn session={snapshot.session} now={now} t={t} /> : null}
      {snapshot ? <CaloriesColumn snapshot={snapshot} t={t} /> : null}
      {snapshot ? null : (
        <TextWidget
          text={signedIn ? 'Tap to open Nonbu and load today' : 'Open Nonbu to sign in'}
          style={{ fontSize: DETAIL_SIZE, color: color(t.textMuted) }}
        />
      )}
    </FlexWidget>
  );
}

function SessionColumn({ session, now, t }: { session: WidgetSnapshot['session']; now: number; t: Theme }) {
  if (!session) {
    return (
      <Column
        label="Fasting"
        labelColor={t.fasting}
        value={<ValueText text={PLACEHOLDER} color={t.text} />}
        detail="Not started"
        progress={0}
        barColor={t.fasting}
        t={t}
      />
    );
  }
  const isFast = session.kind === 'fast';
  const startedAt = new Date(session.started_at).getTime();
  const progress = (now - startedAt) / (session.target_hours * 3600_000);
  const over = progress >= 1;
  const detail = isFast
    ? over
      ? `${session.target_hours}h goal reached`
      : `of ${session.target_hours}h fast`
    : over
      ? 'Window closed'
      : `of ${session.target_hours}h window`;
  const barColor = isFast ? t.fasting : t.eating;
  return (
    <Column
      label={isFast ? 'Fasting' : 'Eating window'}
      labelColor={barColor}
      value={
        <ChronometerWidget
          startedAt={startedAt}
          style={{ fontSize: VALUE_SIZE, color: color(over && !isFast ? t.danger : t.text) }}
        />
      }
      detail={detail}
      progress={progress}
      barColor={barColor}
      t={t}
    />
  );
}

function CaloriesColumn({ snapshot, t }: { snapshot: WidgetSnapshot; t: Theme }) {
  // Nothing logged yet today if the cached totals are from an earlier day.
  const eaten = snapshot.date === todayKey() ? snapshot.calories : 0;
  const goal = snapshot.calorieGoal;
  const over = goal != null && eaten > goal;
  return (
    <Column
      label="Calories"
      labelColor={t.textMuted}
      value={<ValueText text={formatKcal(eaten)} color={over ? t.danger : t.text} />}
      detail={goal == null ? 'kcal today' : over ? `${formatKcal(eaten - goal)} kcal over` : `of ${formatKcal(goal)} kcal`}
      progress={goal ? eaten / goal : 0}
      barColor={over ? t.progress.over : t.progress.fill}
      t={t}
    />
  );
}

type ColumnProps = {
  label: string;
  labelColor: string;
  /** The big figure: a {@link ValueText} or a live {@link ChronometerWidget}. */
  value: ReactElement;
  detail: string;
  progress: number;
  barColor: string;
  t: Theme;
};

function Column({ label, labelColor, value, detail, progress, barColor, t }: ColumnProps) {
  return (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: spacing.xs }}>
      <TextWidget text={label.toUpperCase()} style={{ fontSize: LABEL_SIZE, fontWeight: '600', color: color(labelColor) }} />
      {value}
      <TextWidget text={detail} maxLines={1} truncate="END" style={{ fontSize: DETAIL_SIZE, color: color(t.textMuted) }} />
      <ProgressBar progress={progress} fill={barColor} track={t.progress.track} />
    </FlexWidget>
  );
}

// Bold, like the Chronometer overlay, so both kinds of value match.
function ValueText({ text, color: textColor }: { text: string; color: string }) {
  return <TextWidget text={text} maxLines={1} style={{ fontSize: VALUE_SIZE, fontWeight: 'bold', color: color(textColor) }} />;
}

function ProgressBar({ progress, fill, track }: { progress: number; fill: string; track: string }) {
  const filled = Math.min(Math.max(progress, 0), 1);
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: BAR_HEIGHT,
        flexDirection: 'row',
        borderRadius: BAR_HEIGHT / 2,
        backgroundColor: color(track),
      }}
    >
      {filled > 0 ? (
        <FlexWidget
          style={{ flex: filled, height: 'match_parent', borderRadius: BAR_HEIGHT / 2, backgroundColor: color(fill) }}
        />
      ) : null}
      {filled < 1 ? <FlexWidget style={{ flex: 1 - filled, height: 'match_parent' }} /> : null}
    </FlexWidget>
  );
}
