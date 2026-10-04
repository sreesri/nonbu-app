import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, RefreshControl, Text, View } from 'react-native';

import { useCurrentSession, useMe, useSessions, useSwitchSession, useUpdateSession } from '@/api/hooks';
import type { Session } from '@/api/types';
import { DateTimeField } from '@/components/DateTimeField';
import { ProgressRing } from '@/components/ProgressRing';
import { Body, Button, Card, Chip, ErrorText, Label, Loading, Row, Screen, Title } from '@/components/ui';
import { formatDateTime, formatDuration, formatHours, shiftDateKey, todayKey } from '@/lib/format';
import { DEFAULT_FAST_HOURS } from '@/lib/goals';
import { spacing, useTheme } from '@/lib/theme';
import { useNow } from '@/lib/useNow';

const TARGETS = [12, 14, 16, 18, 20, 24, 36];

function SessionTimer({ session, now }: { session: Session; now: number }) {
  const t = useTheme();
  const update = useUpdateSession();
  const [editingStart, setEditingStart] = useState(false);

  const isFast = session.kind === 'fast';
  const startedMs = new Date(session.started_at).getTime();
  const elapsed = now - startedMs;
  const goalMs = session.target_hours * 3600_000;
  const done = elapsed >= goalMs;

  return (
    <View style={{ alignItems: 'center', gap: spacing.lg }}>
      <ProgressRing progress={elapsed / goalMs} color={isFast ? t.fasting : t.eating}>
        <Label muted>{isFast ? (done ? 'Goal reached' : 'Fasting') : done ? 'Window closed' : 'Eating window'}</Label>
        <Text style={{ fontSize: 40, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>
          {formatDuration(elapsed)}
        </Text>
        <Body muted>
          {done ? `+${formatDuration(elapsed - goalMs)}` : `${formatDuration(goalMs - elapsed)} left`}
        </Body>
      </ProgressRing>
      <View style={{ alignSelf: 'stretch', gap: spacing.xs }}>
        <Body muted>Started {formatDateTime(session.started_at)}</Body>
        <Body muted>
          {isFast ? 'Goal' : 'Closes'} {formatHours(session.target_hours)} ·{' '}
          {formatDateTime(new Date(startedMs + goalMs).toISOString())}
        </Body>
      </View>
      {editingStart ? (
        <View style={{ alignSelf: 'stretch' }}>
          <DateTimeField
            label="Started at"
            value={new Date(session.started_at)}
            maximumDate={new Date()}
            onChange={(d) => {
              setEditingStart(false);
              update.mutate({ id: session.id, started_at: d.toISOString() });
            }}
          />
        </View>
      ) : null}
      <Button
        title={editingStart ? 'Cancel' : 'Edit start'}
        variant="secondary"
        onPress={() => setEditingStart((v) => !v)}
        style={{ alignSelf: 'stretch' }}
      />
      <ErrorText error={update.error} />
    </View>
  );
}

export default function FastScreen() {
  const t = useTheme();
  const now = useNow();
  const me = useMe();
  const current = useCurrentSession();
  const today = todayKey();
  const recent = useSessions(shiftDateKey(today, -6), today, 'fast');
  const switchSession = useSwitchSession();

  const [target, setTarget] = useState<number | null>(null);

  const session = current.data;
  const fasting = session?.kind === 'fast';
  const selectedTarget = target ?? me.data?.goals.default_fast_hours ?? DEFAULT_FAST_HOURS;

  const onStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    switchSession.mutate({ kind: 'fast', target_hours: selectedTarget });
  };

  const onEnd = () => {
    if (!session) return;
    const elapsedH = (now - new Date(session.started_at).getTime()) / 3600_000;
    const finish = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      switchSession.mutate({ kind: 'eat' });
    };
    if (elapsedH < session.target_hours) {
      Alert.alert('End fast early?', `You're at ${formatHours(elapsedH)} of ${session.target_hours}h.`, [
        { text: 'Keep going', style: 'cancel' },
        { text: 'End fast', style: 'destructive', onPress: finish },
      ]);
    } else {
      finish();
    }
  };

  const refreshing = current.isRefetching || recent.isRefetching;
  const refresh = () => {
    current.refetch();
    recent.refetch();
  };

  const completed = recent.data?.filter((f) => f.ended_at) ?? [];

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Title>Fasting</Title>

      {current.isPending ? (
        <Loading />
      ) : (
        <Card style={{ gap: spacing.lg }}>
          {session ? <SessionTimer key={session.id} session={session} now={now} /> : null}
          {fasting ? (
            <Button title="End fast" onPress={onEnd} loading={switchSession.isPending} />
          ) : (
            <>
              <View style={{ gap: spacing.sm }}>
                <Label muted>Target</Label>
                <Row style={{ flexWrap: 'wrap' }}>
                  {TARGETS.map((h) => (
                    <Chip key={h} label={`${h}h`} selected={selectedTarget === h} onPress={() => setTarget(h)} />
                  ))}
                </Row>
              </View>
              <Button title={`Start ${selectedTarget}h fast`} onPress={onStart} loading={switchSession.isPending} />
            </>
          )}
        </Card>
      )}

      <ErrorText error={current.error ?? switchSession.error} />

      <Card>
        <Label muted>Last 7 days</Label>
        {completed.length ? (
          completed.slice(0, 7).map((f) => {
            const hours = (new Date(f.ended_at ?? now).getTime() - new Date(f.started_at).getTime()) / 3600_000;
            const hit = hours >= f.target_hours;
            return (
              <Row key={f.id} style={{ justifyContent: 'space-between' }}>
                <Body>{formatDateTime(f.started_at)}</Body>
                <Body style={{ color: hit ? t.primary : t.textMuted, fontWeight: '600' }}>
                  {formatHours(hours)} {hit ? '✓' : ''}
                </Body>
              </Row>
            );
          })
        ) : (
          <Body muted>No completed fasts yet.</Body>
        )}
      </Card>
    </Screen>
  );
}
