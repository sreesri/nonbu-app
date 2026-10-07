import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useSwitchSession } from '@/api/hooks';
import type { Session } from '@/api/types';
import { formatHours, formatTime } from '@/lib/format';
import { DateTimeSheet } from './DateTimeSheet';
import { Body, Button, Row } from './ui';

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
 */
export function FastControls({
  session,
  targetHours,
  now,
}: {
  session: Session | null | undefined;
  targetHours: number;
  now: number;
}) {
  const switchSession = useSwitchSession();
  const [pickingTime, setPickingTime] = useState(false);
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

  return (
    <>
      <Row>
        <Button
          title={fasting ? 'End fast' : `Start ${targetHours}h fast`}
          onPress={fasting ? onEndNow : () => startFast()}
          style={{ flex: 2 }}
        />
        <Button title="Pick time" variant="secondary" onPress={() => setPickingTime(true)} style={{ flex: 1 }} />
      </Row>
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
          if (fasting) endFast(at);
          else startFast(at);
        }}
      />
    </>
  );
}
