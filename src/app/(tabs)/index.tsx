import { router } from 'expo-router';
import { format } from 'date-fns';
import { RefreshControl, Text, View } from 'react-native';

import { useCurrentSession, useDailySummary, useMe, useSessions } from '@/api/hooks';
import type { Session } from '@/api/types';
import { AnimatedProgressBar } from '@/components/AnimatedProgressBar';
import { FastControls } from '@/components/FastControls';
import { TodayStrip } from '@/components/TodayStrip';
import { Body, Button, Card, ErrorText, Label, Loading, Row, Screen, Title } from '@/components/ui';
import { formatDuration, formatKcal, toDateKey } from '@/lib/format';
import { DEFAULT_FAST_HOURS } from '@/lib/goals';
import { spacing, useTheme } from '@/lib/theme';
import { useNow } from '@/lib/useNow';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const shortDateTime = (ms: number) => format(ms, 'EEE h:mm a');

const MINUTE_MS = 60_000;

function Greeting({ firstName, now }: { firstName: string | undefined; now: number }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Title>
        {greeting(new Date(now).getHours())}
        {firstName ? `, ${firstName}` : ''}
      </Title>
      <Body muted>{format(now, 'EEEE, d MMMM')}</Body>
    </View>
  );
}

/** The ticking countdown, kept apart from the rest of the screen so only it re-renders each second. */
function PhaseTimer({ session }: { session: Session }) {
  const t = useTheme();
  const now = useNow();
  const startMs = new Date(session.started_at).getTime();
  const hours = session.target_hours;
  const totalMs = hours * 3600_000;
  const endMs = startMs + totalMs;
  const remaining = endMs - now;
  const over = remaining <= 0;
  const isFast = session.kind === 'fast';
  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label muted>{isFast ? 'Fasting' : 'Eating window'}</Label>
        <Label muted>{Math.min(Math.floor(((now - startMs) / totalMs) * 100), 999)}%</Label>
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
              ? `${hours}h goal reached 🎉`
              : `left of your ${hours}h fast`
            : over
              ? 'Eating window closed · time to fast'
              : `left of your ${hours}h eating window`}
        </Body>
      </View>
    </>
  );
}

function PhaseTimes({ session }: { session: Session }) {
  const startMs = new Date(session.started_at).getTime();
  const endMs = startMs + session.target_hours * 3600_000;
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Body muted style={{ fontSize: 13 }}>Started {shortDateTime(startMs)}</Body>
      <Body muted style={{ fontSize: 13 }}>
        {session.kind === 'fast' ? 'Goal' : 'Closes'} {shortDateTime(endMs)}
      </Body>
    </Row>
  );
}

export default function HomeScreen() {
  const t = useTheme();
  // The rest of the screen only changes by the minute (e.g. today's date at midnight).
  const minute = useNow(MINUTE_MS);
  const today = toDateKey(new Date(minute));
  const me = useMe();
  const current = useCurrentSession();
  const todaySessions = useSessions(today, today);
  const summary = useDailySummary(today);

  const session = current.data;
  const s = summary.data;
  const firstName = me.data?.name?.split(' ')[0];
  const defaultTarget = me.data?.goals.default_fast_hours ?? DEFAULT_FAST_HOURS;

  const refreshing = me.isRefetching || current.isRefetching || todaySessions.isRefetching || summary.isRefetching;
  const refresh = () => {
    me.refetch();
    current.refetch();
    todaySessions.refetch();
    summary.refetch();
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Greeting firstName={firstName} now={minute} />

      <Card>
        {current.isPending ? (
          <Loading />
        ) : session ? (
          <>
            <PhaseTimer session={session} />
            <TodayStrip
              sessions={todaySessions.data ?? []}
              current={session}
              fastHours={defaultTarget}
              now={minute}
            />
            <PhaseTimes session={session} />
          </>
        ) : (
          <View style={{ gap: spacing.xs }}>
            <Label muted>Fasting</Label>
            <Body muted>No fasts yet. Start one to see your timer here.</Body>
          </View>
        )}
        {current.isSuccess ? <FastControls session={session} targetHours={defaultTarget} alwaysPickTime /> : null}
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
                    {formatKcal(eaten)}
                  </Text>
                  <Text style={{ fontSize: 18, color: t.textMuted }}>
                    {goal ? ` / ${formatKcal(goal)}` : ''} kcal
                  </Text>
                </Text>
                <AnimatedProgressBar progress={goal ? eaten / goal : 0} color={over ? t.progress.over : t.progress.fill} />
                <Body muted>
                  {goal == null
                    ? 'Set a daily calorie goal in Settings'
                    : over
                      ? `${formatKcal(eaten - goal)} kcal over target`
                      : `${formatKcal(goal - eaten)} kcal left`}
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
            onPress={() => router.navigate('/meals')}
            style={{ flex: 1 }}
          />
          <Button
            title="+ Log meal"
            onPress={() => router.push({ pathname: '/meal/new', params: { date: today } })}
            style={{ flex: 2 }}
          />
        </Row>
      </Card>

      <ErrorText error={me.error ?? current.error ?? summary.error} />
    </Screen>
  );
}
