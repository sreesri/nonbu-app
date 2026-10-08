import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useSaveMeal, useSwitchSession } from '@/api/hooks';
import type { Session } from '@/api/types';
import { formatHours, formatTime } from '@/lib/format';
import { guessMealType } from '@/lib/nutrition';
import { spacing } from '@/lib/theme';
import { DateTimeSheet } from './DateTimeSheet';
import { MealBuilder, toMealItem, type DraftItem } from './MealBuilder';
import { Body, Button, Label, Row } from './ui';

/** The server requires a switch to be strictly after the current session's start. */
const MIN_SWITCH_GAP_MS = 60_000;

/** "Fasted 14h 25m · 16h goal 12:15 PM" for a session that would start at `startMs`. */
export function SessionPreview({
  isFast,
  startMs,
  targetHours,
  now,
}: {
  isFast: boolean;
  startMs: number;
  targetHours: number;
  now: number;
}) {
  const elapsedH = Math.max(now - startMs, 0) / 3600_000;
  const dueAt = new Date(startMs + targetHours * 3600_000).toISOString();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Body muted>
        {isFast ? 'Fasted' : 'Eating'} <Body style={{ fontWeight: '600' }}>{formatHours(elapsedH)}</Body>
      </Body>
      <Body muted>
        {isFast ? `${formatHours(targetHours)} goal` : 'Closes'}{' '}
        <Body style={{ fontWeight: '600' }}>{formatTime(dueAt)}</Body>
      </Body>
    </Row>
  );
}

/**
 * "Start Nh fast" / "End fast" for the current session, plus "Pick time" to start or end
 * it at an earlier time. Ending a fast before its goal asks for confirmation first.
 * With `alwaysPickTime`, the main button opens the time picker (preset to now) instead.
 * The time picker also logs the meal that breaks the fast, or the last one before it.
 */
export function FastControls({
  session,
  targetHours,
  now,
  alwaysPickTime = false,
}: {
  session: Session | null | undefined;
  targetHours: number;
  now: number;
  alwaysPickTime?: boolean;
}) {
  const switchSession = useSwitchSession();
  const saveMeal = useSaveMeal();
  const [pickingTime, setPickingTime] = useState(false);
  const [mealItems, setMealItems] = useState<DraftItem[]>([]);
  const fasting = session?.kind === 'fast';

  const startFast = (at?: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    switchSession.mutate({ kind: 'fast', target_hours: targetHours, at: at?.toISOString() });
  };

  const endFast = (at?: Date) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    switchSession.mutate({ kind: 'eat', at: at?.toISOString() });
  };

  const onEndNow = () => {
    if (!session) return;
    const elapsedH = (now - new Date(session.started_at).getTime()) / 3600_000;
    if (elapsedH < session.target_hours) {
      Alert.alert('End fast early?', `You're at ${formatHours(elapsedH)} of ${session.target_hours}h.`, [
        { text: 'Keep going', style: 'cancel' },
        { text: 'End fast', style: 'destructive', onPress: () => endFast() },
      ]);
    } else {
      endFast();
    }
  };

  const openPicker = () => {
    setMealItems([]);
    setPickingTime(true);
  };

  const logMeal = (at: Date) => {
    if (!mealItems.length) return;
    saveMeal.mutate({
      eaten_at: at.toISOString(),
      meal_type: guessMealType(at),
      name: null,
      notes: null,
      items: mealItems.map(toMealItem),
    });
  };
  const title = fasting ? 'End fast' : `Start ${targetHours}h fast`;

  return (
    <>
      {alwaysPickTime ? (
        <Button title={title} onPress={openPicker} />
      ) : (
        <Row>
          <Button title={title} onPress={fasting ? onEndNow : () => startFast()} style={{ flex: 2 }} />
          <Button title="Pick time" variant="secondary" onPress={openPicker} style={{ flex: 1 }} />
        </Row>
      )}
      <DateTimeSheet
        visible={pickingTime}
        title={fasting ? 'Fast ended' : 'Fast started'}
        subtitle={fasting ? 'When did you break your fast?' : 'When did you start fasting?'}
        value={new Date(now)}
        minimumDate={session ? new Date(new Date(session.started_at).getTime() + MIN_SWITCH_GAP_MS) : undefined}
        maximumDate={new Date(now)}
        describe={(at) =>
          fasting && session ? (
            <SessionPreview
              isFast
              startMs={new Date(session.started_at).getTime()}
              targetHours={session.target_hours}
              now={at.getTime()}
            />
          ) : (
            <SessionPreview isFast startMs={at.getTime()} targetHours={targetHours} now={now} />
          )
        }
        onCancel={() => setPickingTime(false)}
        onSave={(at) => {
          setPickingTime(false);
          logMeal(at);
          if (fasting) endFast(at);
          else startFast(at);
        }}
      >
        <View style={{ gap: spacing.sm }}>
          <Label muted>{fasting ? 'Meal that breaks the fast' : 'Last meal before the fast'} (optional)</Label>
          <MealBuilder items={mealItems} onChange={setMealItems} searchable={false} />
        </View>
      </DateTimeSheet>
    </>
  );
}
