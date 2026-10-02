import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, RefreshControl, Text, View } from 'react-native';

import { useCurrentFast, useEndFast, useFasts, useMe, useStartFast, useUpdateFast } from '@/api/hooks';
import { DateTimeField } from '@/components/DateTimeField';
import { ProgressRing } from '@/components/ProgressRing';
import { Body, Button, Card, Chip, ErrorText, Label, Loading, Row, Screen, Title } from '@/components/ui';
import { formatDateTime, formatDuration, formatHours, shiftDateKey, todayKey } from '@/lib/format';
import { spacing, useTheme } from '@/lib/theme';
import { useNow } from '@/lib/useNow';

const TARGETS = [12, 14, 16, 18, 20, 24, 36];

export default function FastScreen() {
  const t = useTheme();
  const now = useNow();
  const me = useMe();
  const current = useCurrentFast();
  const today = todayKey();
  const recent = useFasts(shiftDateKey(today, -6), today);
  const start = useStartFast();
  const end = useEndFast();
  const update = useUpdateFast();

  const [target, setTarget] = useState<number | null>(null);
  const [editingStart, setEditingStart] = useState(false);

  const fast = current.data;
  const selectedTarget = target ?? me.data?.goals.default_fast_hours ?? 16;

  const lastEnded = recent.data?.find((f) => f.ended_at);

  const onStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    start.mutate({ target_hours: selectedTarget });
  };

  const onEnd = () => {
    if (!fast) return;
    const elapsedH = (now - new Date(fast.started_at).getTime()) / 3600_000;
    const finish = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      end.mutate({ id: fast.id });
    };
    if (elapsedH < fast.target_hours) {
      Alert.alert('End fast early?', `You're at ${formatHours(elapsedH)} of ${fast.target_hours}h.`, [
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

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Title>Fasting</Title>

      {current.isPending ? (
        <Loading />
      ) : fast ? (
        (() => {
          const startedMs = new Date(fast.started_at).getTime();
          const elapsed = now - startedMs;
          const goalMs = fast.target_hours * 3600_000;
          const done = elapsed >= goalMs;
          return (
            <Card style={{ alignItems: 'center', gap: spacing.lg }}>
              <ProgressRing progress={elapsed / goalMs}>
                <Label muted>{done ? 'Goal reached' : 'Elapsed'}</Label>
                <Text style={{ fontSize: 40, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>
                  {formatDuration(elapsed)}
                </Text>
                <Body muted>
                  {done ? `+${formatDuration(elapsed - goalMs)}` : `${formatDuration(goalMs - elapsed)} left`}
                </Body>
              </ProgressRing>
              <View style={{ alignSelf: 'stretch', gap: spacing.xs }}>
                <Body muted>Started {formatDateTime(fast.started_at)}</Body>
                <Body muted>
                  Goal {fast.target_hours}h · {formatDateTime(new Date(startedMs + goalMs).toISOString())}
                </Body>
              </View>
              {editingStart ? (
                <View style={{ alignSelf: 'stretch' }}>
                  <DateTimeField
                    label="Started at"
                    value={new Date(fast.started_at)}
                    maximumDate={new Date()}
                    onChange={(d) => {
                      setEditingStart(false);
                      update.mutate({ id: fast.id, started_at: d.toISOString() });
                    }}
                  />
                </View>
              ) : null}
              <Row style={{ alignSelf: 'stretch' }}>
                <Button
                  title={editingStart ? 'Cancel' : 'Edit start'}
                  variant="secondary"
                  onPress={() => setEditingStart((v) => !v)}
                  style={{ flex: 1 }}
                />
                <Button title="End fast" onPress={onEnd} loading={end.isPending} style={{ flex: 2 }} />
              </Row>
            </Card>
          );
        })()
      ) : (
        <Card style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Label muted>Eating window</Label>
            <Text style={{ fontSize: 32, fontWeight: '700', color: t.text, fontVariant: ['tabular-nums'] }}>
              {lastEnded?.ended_at ? formatDuration(now - new Date(lastEnded.ended_at).getTime()) : '—'}
            </Text>
            {lastEnded?.ended_at ? <Body muted>since {formatDateTime(lastEnded.ended_at)}</Body> : null}
          </View>
          <View style={{ gap: spacing.sm }}>
            <Label muted>Target</Label>
            <Row style={{ flexWrap: 'wrap' }}>
              {TARGETS.map((h) => (
                <Chip key={h} label={`${h}h`} selected={selectedTarget === h} onPress={() => setTarget(h)} />
              ))}
            </Row>
          </View>
          <Button title={`Start ${selectedTarget}h fast`} onPress={onStart} loading={start.isPending} />
        </Card>
      )}

      <ErrorText error={current.error ?? start.error ?? end.error ?? update.error} />

      <Card>
        <Label muted>Last 7 days</Label>
        {recent.data?.filter((f) => f.ended_at).length ? (
          recent.data
            .filter((f) => f.ended_at)
            .slice(0, 7)
            .map((f) => {
              const hours = (new Date(f.ended_at!).getTime() - new Date(f.started_at).getTime()) / 3600_000;
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
