'use no memo'; // Widget trees are built by calling these functions directly, outside React.

import type { ReactElement } from 'react';
import { FlexWidget, TextWidget, type ColorProp, type WidgetRepresentation } from 'react-native-android-widget';

import { formatKcal, todayKey } from '@/lib/format';
import { radius, spacing, themes, type Theme } from '@/lib/theme';
import { ChronometerWidget } from './ChronometerWidget';
import type { WidgetSnapshot } from './snapshot';

/** Must match the widget `name` in app.json's withNonbuWidget plugin config. */
export const WIDGET_NAME = 'NonbuWidget';

const PLACEHOLDER = '–';
const PADDING = spacing.lg;
const SECTION_GAP = spacing.lg;

// Rough text metrics for fitting the big value to the space the widget actually has.
/** Rendered line height relative to font size. */
const LINE_HEIGHT = 1.3;
/** Label and detail text size relative to the big value. */
const SMALL_RATIO = 0.42;
/** Width of a bold "+HH:MM:SS" in ems: the widest value either section shows. */
const VALUE_EMS = 5.5;
const MIN_VALUE_SIZE = 18;
const MAX_VALUE_SIZE = 44;
const MIN_SMALL_SIZE = 11;
const MIN_BAR_HEIGHT = 6;
const MAX_BAR_HEIGHT = 12;
/** Progress bar segments are sized by integer layout weights; this sets their resolution. */
const BAR_RESOLUTION = 1000;

/** Theme tokens are all `#hex` or `rgba()` strings, which is what the widget renderer accepts. */
const color = (token: string) => token as ColorProp;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Widget size in dp, as reported by the launcher. */
export type WidgetSize = { width: number; height: number };

/**
 * `columns`: fasting and calories side by side (short widgets).
 * `rows`: stacked at full width, which lets the numbers grow on taller widgets.
 */
type Layout = 'columns' | 'rows';

type Metrics = { layout: Layout; value: number; small: number; bar: number };

/** Heights of each section's lines, as multiples of the value font size, plus fixed gaps. */
const STACK_EMS = { columns: 2 * SMALL_RATIO * LINE_HEIGHT + LINE_HEIGHT + 0.25, rows: SMALL_RATIO * LINE_HEIGHT + LINE_HEIGHT + 0.25 };
const STACK_GAPS = { columns: 3 * spacing.xs, rows: 2 * spacing.xs };

function valueSizeFor(layout: Layout, { width, height }: WidgetSize): number {
  const innerWidth = width - 2 * PADDING;
  const innerHeight = height - 2 * PADDING;
  const box =
    layout === 'columns'
      ? { width: (innerWidth - SECTION_GAP) / 2, height: innerHeight }
      : { width: innerWidth, height: (innerHeight - SECTION_GAP) / 2 };
  return Math.min(box.width / VALUE_EMS, (box.height - STACK_GAPS[layout]) / STACK_EMS[layout]);
}

/** Picks whichever layout fits the biggest numbers into this widget's size. */
function metricsFor(size: WidgetSize): Metrics {
  const columns = valueSizeFor('columns', size);
  const rows = valueSizeFor('rows', size);
  const layout: Layout = rows > columns ? 'rows' : 'columns';
  const value = clamp(Math.floor(Math.max(columns, rows)), MIN_VALUE_SIZE, MAX_VALUE_SIZE);
  return {
    layout,
    value,
    small: Math.max(Math.round(value * SMALL_RATIO), MIN_SMALL_SIZE),
    bar: clamp(Math.round(value / 4), MIN_BAR_HEIGHT, MAX_BAR_HEIGHT),
  };
}

type Props = { snapshot: WidgetSnapshot | null; signedIn: boolean; now: number; m: Metrics; t: Theme };

/** The widget in both color schemes, sized for `size`; Android picks a scheme from the system setting. */
export function renderNonbuWidget(
  snapshot: WidgetSnapshot | null,
  signedIn: boolean,
  size: WidgetSize,
): WidgetRepresentation {
  const now = Date.now();
  const m = metricsFor(size);
  return {
    light: <NonbuWidget snapshot={snapshot} signedIn={signedIn} now={now} m={m} t={themes.light} />,
    dark: <NonbuWidget snapshot={snapshot} signedIn={signedIn} now={now} m={m} t={themes.dark} />,
  };
}

function NonbuWidget({ snapshot, signedIn, now, m, t }: Props) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="Open Nonbu"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: m.layout === 'columns' ? 'row' : 'column',
        flexGap: SECTION_GAP,
        padding: PADDING,
        borderRadius: radius.lg,
        backgroundColor: color(t.surface),
      }}
    >
      {/* The widget renderer doesn't support fragments, hence one condition per child. */}
      {snapshot ? <SessionSection session={snapshot.session} now={now} m={m} t={t} /> : null}
      {snapshot ? <CaloriesSection snapshot={snapshot} m={m} t={t} /> : null}
      {snapshot ? null : (
        <TextWidget
          text={signedIn ? 'Tap to open Nonbu and load today' : 'Open Nonbu to sign in'}
          style={{ fontSize: m.small, color: color(t.textMuted) }}
        />
      )}
    </FlexWidget>
  );
}

type SectionProps = { m: Metrics; t: Theme };

function SessionSection({ session, now, m, t }: SectionProps & { session: WidgetSnapshot['session']; now: number }) {
  if (!session) {
    return (
      <Section
        label="Fasting"
        labelColor={t.fasting}
        value={<ValueText text={PLACEHOLDER} color={t.text} m={m} />}
        detail="Not started"
        progress={0}
        barColor={t.fasting}
        m={m}
        t={t}
      />
    );
  }
  const isFast = session.kind === 'fast';
  const startMs = new Date(session.started_at).getTime();
  const totalMs = session.target_hours * 3600_000;
  const endMs = startMs + totalMs;
  // The minute tick flips this, so the clock switches from countdown to "+" overtime within a minute.
  const over = now >= endMs;
  const detail = isFast
    ? over
      ? `${session.target_hours}h goal reached`
      : `left of ${session.target_hours}h fast`
    : over
      ? 'Window closed'
      : `left of ${session.target_hours}h window`;
  const barColor = isFast ? t.fasting : t.eating;
  return (
    <Section
      label={isFast ? 'Fasting' : 'Eating window'}
      labelColor={barColor}
      value={
        <ChronometerWidget
          base={endMs}
          countDown={!over}
          prefix={over ? '+' : ''}
          style={{ fontSize: m.value, color: color(over && !isFast ? t.danger : t.text) }}
        />
      }
      detail={detail}
      progress={(now - startMs) / totalMs}
      barColor={barColor}
      m={m}
      t={t}
    />
  );
}

function CaloriesSection({ snapshot, m, t }: SectionProps & { snapshot: WidgetSnapshot }) {
  // Nothing logged yet today if the cached totals are from an earlier day.
  const eaten = snapshot.date === todayKey() ? snapshot.calories : 0;
  const goal = snapshot.calorieGoal;
  const over = goal != null && eaten > goal;
  return (
    <Section
      label="Calories"
      labelColor={t.textMuted}
      value={<ValueText text={formatKcal(eaten)} color={over ? t.danger : t.text} m={m} />}
      detail={goal == null ? 'kcal today' : over ? `${formatKcal(eaten - goal)} kcal over` : `of ${formatKcal(goal)} kcal`}
      progress={goal ? eaten / goal : 0}
      barColor={over ? t.progress.over : t.progress.fill}
      m={m}
      t={t}
    />
  );
}

type SectionContentProps = SectionProps & {
  label: string;
  labelColor: string;
  /** The big figure: a {@link ValueText} or a live {@link ChronometerWidget}. */
  value: ReactElement;
  detail: string;
  progress: number;
  barColor: string;
};

/**
 * One stat, spread over its share of the widget: label and value at the top, progress at the
 * bottom. Side by side the detail sits above the bar; stacked it shares the label's line.
 */
function Section({ label, labelColor, value, detail, progress, barColor, m, t }: SectionContentProps) {
  const labelText = (
    <TextWidget text={label.toUpperCase()} style={{ fontSize: m.small, fontWeight: '600', color: color(labelColor) }} />
  );
  const detailText = (
    <TextWidget text={detail} maxLines={1} truncate="END" style={{ fontSize: m.small, color: color(t.textMuted) }} />
  );
  const bar = <ProgressBar progress={progress} fill={barColor} track={t.progress.track} height={m.bar} />;
  // Zero size plus an equal weight gives the two sections exactly half the space each.
  const share = m.layout === 'columns' ? { width: 0, height: 'match_parent' as const } : { width: 'match_parent' as const, height: 0 };

  if (m.layout === 'columns') {
    return (
      <FlexWidget style={{ ...share, flex: 1, flexDirection: 'column', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'column', flexGap: spacing.xs }}>
          {labelText}
          {value}
        </FlexWidget>
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', flexGap: spacing.xs }}>
          {detailText}
          {bar}
        </FlexWidget>
      </FlexWidget>
    );
  }
  return (
    <FlexWidget style={{ ...share, flex: 1, flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {labelText}
        {detailText}
      </FlexWidget>
      {value}
      {bar}
    </FlexWidget>
  );
}

// Bold, like the Chronometer overlay, so both kinds of value match.
function ValueText({ text, color: textColor, m }: { text: string; color: string; m: Metrics }) {
  return <TextWidget text={text} maxLines={1} style={{ fontSize: m.value, fontWeight: 'bold', color: color(textColor) }} />;
}

function ProgressBar({ progress, fill, track, height }: { progress: number; fill: string; track: string; height: number }) {
  // Layout weights are integers natively (fractions truncate to 0), so split a fixed resolution.
  const filled = Math.round(clamp(progress, 0, 1) * BAR_RESOLUTION);
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height,
        flexDirection: 'row',
        borderRadius: height / 2,
        backgroundColor: color(track),
      }}
    >
      {filled > 0 ? (
        <FlexWidget
          style={{ width: 0, flex: filled, height: 'match_parent', borderRadius: height / 2, backgroundColor: color(fill) }}
        />
      ) : null}
      {filled < BAR_RESOLUTION ? <FlexWidget style={{ width: 0, flex: BAR_RESOLUTION - filled, height: 'match_parent' }} /> : null}
    </FlexWidget>
  );
}
