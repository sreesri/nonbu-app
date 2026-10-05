import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useCompleteOnboarding } from '@/api/hooks';
import type { OnboardingSession } from '@/api/types';
import { deviceTimezone } from '@/auth/AuthProvider';
import { DateTimeField } from '@/components/DateTimeField';
import { FastingScheduleEditor } from '@/components/FastingScheduleEditor';
import { GoalFields } from '@/components/GoalFields';
import { Body, Button, Card, ErrorText, Label, Row, Screen, Title } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { DEFAULT_FAST_HOURS, HOURS_PER_DAY, goalDrafts, parseGoalDrafts } from '@/lib/goals';
import { radius, spacing, useTheme } from '@/lib/theme';
import { useNow } from '@/lib/useNow';

type Situation = 'fasting' | 'eating' | 'later';

const STEPS = ['Your schedule', 'Right now', 'Daily goals'] as const;
const DEFAULT_LATER_START_HOURS = 2;
const HOUR_MS = 3600_000;

const SITUATIONS: { key: Situation; title: string; detail: string; timeLabel: string }[] = [
  { key: 'fasting', title: "I'm fasting", detail: 'Pick up the fast you are already on.', timeLabel: 'Fast started at' },
  { key: 'eating', title: "I'm in my eating window", detail: 'Your last fast has ended.', timeLabel: 'Eating since' },
  {
    key: 'later',
    title: "I'll start fasting later",
    detail: 'You are eating today until your fast starts.',
    timeLabel: 'Start fasting at',
  },
];

function SituationOption({
  title,
  detail,
  selected,
  onPress,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.xs,
        borderColor: selected ? t.chip.selectedBorder : t.chip.border,
        backgroundColor: selected ? t.chip.selectedBg : t.chip.bg,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', color: selected ? t.chip.selectedFg : t.chip.fg }}>{title}</Text>
      <Text style={{ color: selected ? t.chip.selectedFg : t.textMuted }}>{detail}</Text>
    </Pressable>
  );
}

/** What the chosen time means, or why it can't be used. */
function describeTime(situation: Situation, at: Date, fastHours: number, now: number) {
  const atMs = at.getTime();
  if (situation === 'later') {
    return atMs <= now
      ? { error: 'Pick a time later than now.' }
      : { preview: "Today's eating window runs from midnight until then." };
  }
  if (atMs > now) return { error: 'Pick a time that has already passed.' };
  const hours = situation === 'fasting' ? fastHours : HOURS_PER_DAY - fastHours;
  const due = new Date(atMs + hours * HOUR_MS).toISOString();
  return {
    preview: situation === 'fasting' ? `Goal reached ${formatDateTime(due)}` : `Window closes ${formatDateTime(due)}`,
  };
}

function toOnboardingSession(situation: Situation, at: Date): OnboardingSession {
  const iso = at.toISOString();
  if (situation === 'later') return { kind: 'eat', fast_at: iso };
  return { kind: situation === 'fasting' ? 'fast' : 'eat', started_at: iso };
}

export default function OnboardingScreen() {
  const now = useNow(60_000);
  const complete = useCompleteOnboarding();
  const [step, setStep] = useState(0);
  const [fastHours, setFastHours] = useState(DEFAULT_FAST_HOURS);
  const [situation, setSituation] = useState<Situation>('fasting');
  const [times, setTimes] = useState<Record<Situation, Date>>(() => ({
    fasting: new Date(),
    eating: new Date(),
    later: new Date(Date.now() + DEFAULT_LATER_START_HOURS * HOUR_MS),
  }));
  const [drafts, setDrafts] = useState(() => goalDrafts());

  const chosen = SITUATIONS.find((s) => s.key === situation) ?? SITUATIONS[0];
  const time = describeTime(situation, times[situation], fastHours, now);
  const isLast = step === STEPS.length - 1;

  const finish = (withGoals: boolean) =>
    complete.mutate({
      timezone: deviceTimezone(),
      goals: { default_fast_hours: fastHours, ...(withGoals ? parseGoalDrafts(drafts) : {}) },
      current: toOnboardingSession(situation, times[situation]),
    });

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Label muted>
          Step {step + 1} of {STEPS.length}
        </Label>
        <Title>{STEPS[step]}</Title>
      </View>

      {step === 0 ? (
        <Card>
          <Body muted>How many hours a day do you fast? The rest is your eating window.</Body>
          <FastingScheduleEditor fastHours={fastHours} onChange={setFastHours} />
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
            {SITUATIONS.map((s) => (
              <SituationOption
                key={s.key}
                title={s.title}
                detail={s.detail}
                selected={situation === s.key}
                onPress={() => setSituation(s.key)}
              />
            ))}
          </View>
          <DateTimeField
            key={situation}
            label={chosen.timeLabel}
            value={times[situation]}
            minimumDate={situation === 'later' ? new Date(now) : undefined}
            maximumDate={situation === 'later' ? undefined : new Date(now)}
            onChange={(d) => setTimes((prev) => ({ ...prev, [situation]: d }))}
          />
          {'error' in time ? <ErrorText error={time.error} /> : <Body muted>{time.preview}</Body>}
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <Body muted>Optional. You can change these any time in Settings.</Body>
          <GoalFields drafts={drafts} onChange={(key, value) => setDrafts((d) => ({ ...d, [key]: value }))} />
        </Card>
      ) : null}

      <ErrorText error={complete.error} />

      <Row>
        {step > 0 ? (
          <Button title="Back" variant="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
        ) : null}
        <Button
          title={isLast ? 'Finish' : 'Next'}
          onPress={isLast ? () => finish(true) : () => setStep(step + 1)}
          disabled={step === 1 && 'error' in time}
          loading={isLast && complete.isPending}
          style={{ flex: 2 }}
        />
      </Row>
      {isLast ? (
        <Button title="Skip goals for now" variant="secondary" onPress={() => finish(false)} disabled={complete.isPending} />
      ) : null}
    </Screen>
  );
}
