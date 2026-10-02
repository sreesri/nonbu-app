import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { RefreshControl, Text, View } from 'react-native';

import { useCurrentFast, useDailySummary, useFasts, useMe, useStartFast } from '@/api/hooks';
import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { Body, Button, Card, ErrorText, Label, Loading, Row, Screen, Title } from '@/components/ui';
import { formatDuration, shiftDateKey, todayKey } from '@/lib/format';
import { spacing, useTheme } from '@/lib/theme';
import { useNow } from '@/lib/useNow';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const kcal = (n: number) => Math.round(n).toLocaleString();
const shortDateTime = (ms: number) => format(ms, 'EEE h:mm a');

export default function HomeScreen() {
  const t = useTheme();
  const now = useNow();
  const today = todayKey();
  const me = useMe();
  const current = useCurrentFast();
  const recent = useFasts(shiftDateKey(today, -6), today);
  const summary = useDailySummary(today);
  const start = useStartFast();

  const fast = current.data;
  const s = summary.data;
  const firstName = me.data?.name?.split(' ')[0];
  const defaultTarget = me.data?.goals.default_fast_hours ?? 16;
  const eatingHours = me.data?.goals.eating_window_hours ?? 24 - defaultTarget;
  const lastEnded = recent.data?.find((f) => f.ended_at);

  // The current phase: an open fast, or the eating window (from the fasting schedule in
  // Settings) since the last fast ended.
  const phase = fast
    ? {
        kind: 'fast' as const,
        startMs: new Date(fast.started_at).getTime(),
        hours: fast.target_hours,
      }
    : lastEnded?.ended_at && eatingHours > 0
      ? {
          kind: 'eat' as const,
          startMs: parseISO(lastEnded.ended_at).getTime(),
          hours: eatingHours,
        }
      : null;

  const refreshing = me.isRefetching || current.isRefetching || recent.isRefetching || summary.isRefetching;
  const refresh = () => {
    me.refetch();
    current.refetch();
    recent.refetch();
    summary.refetch();
  };

  const onStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    start.mutate({ target_hours: defaultTarget });
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <View style={{ gap: spacing.xs }}>
        <Title>
          {greeting(new Date(now).getHours())}
          {firstName ? `, ${firstName}` : ''}
        </Title>
        <Body muted>{format(now, 'EEEE, d MMMM')}</Body>
      </View>

      <Card>
        {current.isPending || recent.isPending ? (
          <Loading />
        ) : phase ? (
          (() => {
            const totalMs = phase.hours * 3600_000;
            const endMs = phase.startMs + totalMs;
            const remaining = endMs - now;
            const over = remaining <= 0;
            const isFast = phase.kind === 'fast';
            const color = isFast ? t.fasting : t.eating;
            return (
              <>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Label muted>{isFast ? 'Fasting' : 'Eating window'}</Label>
                  <Label muted>{Math.min(Math.floor(((now - phase.startMs) / totalMs) * 100), 999)}%</Label>
                </Row>
                <View style={{ gap: spacing.xs }}>
                  <Text
                    style={{
                      fontSize: 44,
                      fontWeight: '700',
                      color: over && !isFast ? t.danger : t.text,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {over ? '+' : ''}
                    {formatDuration(Math.abs(remaining))}
                  </Text>
                  <Body muted>
                    {isFast
                      ? over
                        ? `${phase.hours}h goal reached 🎉`
                        : `left of your ${phase.hours}h fast`
                      : over
                        ? 'Eating window closed · time to fast'
                        : `left of your ${phase.hours}h eating window`}
                  </Body>
                </View>
                <AnimatedProgressBar progress={(now - phase.startMs) / totalMs} color={color} live />
                <Row style={{ justifyContent: 'space-between' }}>
                  <Body muted style={{ fontSize: 13 }}>Started {shortDateTime(phase.startMs)}</Body>
                  <Body muted style={{ fontSize: 13 }}>
                    {isFast ? 'Goal' : 'Closes'} {shortDateTime(endMs)}
                  </Body>
                </Row>
              </>
            );
          })()
        ) : (
          <View style={{ gap: spacing.xs }}>
            <Label muted>Fasting</Label>
            <Body muted>No fasts yet. Start one to see your timer here.</Body>
          </View>
        )}
        {fast ? (
          <Button title="Open timer" variant="secondary" onPress={() => router.navigate('/fast')} />
        ) : current.isSuccess ? (
          <Button title={`Start ${defaultTarget}h fast`} onPress={onStart} loading={start.isPending} />
        ) : null}
      </Card>

      <Card>
        <Label muted>Calories today</Label>
        {s ? (
          (() => {
            const eaten = s.totals.calories;
            const goal = s.goals.daily_calories;
            const over = goal != null && eaten > goal;
            return (
              <>
                <Text style={{ color: t.text, fontVariant: ['tabular-nums'] }}>
                  <Text style={{ fontSize: 32, fontWeight: '700', color: over ? t.danger : t.text }}>
                    {kcal(eaten)}
                  </Text>
                  <Text style={{ fontSize: 18, color: t.textMuted }}>
                    {goal ? ` / ${kcal(goal)}` : ''} kcal
                  </Text>
                </Text>
                <AnimatedProgressBar progress={goal ? eaten / goal : 0} color={over ? t.progress.over : t.progress.fill} />
                <Body muted>
                  {goal == null
                    ? 'Set a daily calorie goal in Settings'
                    : over
                      ? `${kcal(eaten - goal)} kcal over target`
                      : `${kcal(goal - eaten)} kcal left`}
                </Body>
              </>
            );
          })()
        ) : (
          <Loading />
        )}
        <Row>
          <Button
            title="View log"
            variant="secondary"
            onPress={() => router.navigate('/food')}
            style={{ flex: 1 }}
          />
          <Button
            title="+ Add food"
            onPress={() => router.push({ pathname: '/food/new', params: { date: today } })}
            style={{ flex: 2 }}
          />
        </Row>
      </Card>

      <ErrorText error={me.error ?? current.error ?? recent.error ?? summary.error ?? start.error} />
    </Screen>
  );
}
