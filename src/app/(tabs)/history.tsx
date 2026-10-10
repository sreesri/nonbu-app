import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, Text, View } from 'react-native';

import { useDeleteSession, useRangeSummary, useSessions, useStreak } from '@/api/hooks';
import type { DailySummary, Session } from '@/api/types';
import { Body, Card, Chip, ErrorText, Label, Loading, Row, Screen, Title } from '@/components/ui';
import { formatDateTime, formatHours, shiftDateKey, todayKey } from '@/lib/format';
import { spacing, useTheme, type Theme } from '@/lib/theme';
import { useNow } from '@/lib/useNow';

const RANGES = [7, 14, 30];

function BarChart({
  days,
  value,
  goal,
  color,
  unit,
}: {
  days: DailySummary[];
  value: (d: DailySummary) => number;
  goal?: number | null;
  color: string;
  unit: string;
}) {
  const t = useTheme();
  const max = Math.max(goal ?? 0, ...days.map(value), 1);
  const height = 120;
  const showLabels = days.length <= 14;
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        {goal ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: (goal / max) * height,
              borderTopWidth: 1,
              borderStyle: 'dashed',
              borderColor: t.chart.goalLine,
            }}
          />
        ) : null}
        {days.map((d) => (
          <View
            key={d.date}
            style={{
              flex: 1,
              height: Math.max((value(d) / max) * height, value(d) ? 2 : 0),
              backgroundColor: goal && value(d) > goal ? t.chart.over : color,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            }}
          />
        ))}
      </View>
      {showLabels ? (
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {days.map((d) => (
            <Text key={d.date} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: t.chart.label }}>
              {format(parseISO(d.date), days.length <= 7 ? 'EEE' : 'd')}
            </Text>
          ))}
        </View>
      ) : null}
      <Body muted style={{ fontSize: 13 }}>
        Avg {Math.round(days.reduce((s, d) => s + value(d), 0) / Math.max(days.length, 1))} {unit}
        {goal ? ` · goal ${Math.round(goal)} ${unit}` : ''}
      </Body>
    </View>
  );
}

export default function HistoryScreen() {
  const t = useTheme();
  const [range, setRange] = useState(7);
  const to = todayKey();
  const from = shiftDateKey(to, -(range - 1));
  const summary = useRangeSummary(from, to);
  const sessions = useSessions(from, to);
  const streak = useStreak();
  const del = useDeleteSession();
  const now = useNow(60_000);

  const days = summary.data ?? [];
  const goals = days[0]?.goals;

  const confirmDelete = (id: number) =>
    Alert.alert(
      'Delete session?',
      'The sessions around it are joined back together (deleting the current one resumes the previous). This cannot be undone.',
      [
      { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id) },
      ],
    );

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching || sessions.isRefetching || streak.isRefetching}
          onRefresh={() => {
            summary.refetch();
            sessions.refetch();
            streak.refetch();
          }}
        />
      }
    >
      <Title>History</Title>
      <Row>
        {RANGES.map((r) => (
          <Chip key={r} label={`${r} days`} selected={range === r} onPress={() => setRange(r)} />
        ))}
      </Row>
      <ErrorText error={summary.error ?? sessions.error} />

      {summary.isPending ? (
        <Loading />
      ) : (
        <>
          <Card>
            <Label muted>Calories</Label>
            <BarChart days={days} value={(d) => d.totals.calories} goal={goals?.daily_calories} color={t.primary} unit="kcal" />
          </Card>
          <Card>
            <Label muted>Protein</Label>
            <BarChart days={days} value={(d) => d.totals.protein_g} goal={goals?.protein_g} color={t.protein} unit="g" />
          </Card>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Label muted>Fasting hours</Label>
              {streak.data ? <Label muted>🔥 {streak.data.days} day streak</Label> : null}
            </Row>
            <BarChart days={days} value={(d) => d.fasting_hours} color={t.fasting} unit="h" />
          </Card>
        </>
      )}

      <Card>
        <Label muted>Sessions</Label>
        {sessions.data?.length ? (
          sessions.data.map((s) => (
            <SessionRow key={s.id} session={s} now={now} t={t} onLongPress={() => confirmDelete(s.id)} />
          ))
        ) : (
          <Body muted>No sessions in this range.</Body>
        )}
        {sessions.data?.length ? <Body muted style={{ fontSize: 12 }}>Long-press a session to delete it.</Body> : null}
      </Card>
    </Screen>
  );
}

function SessionRow({
  session,
  now,
  t,
  onLongPress,
}: {
  session: Session;
  now: number;
  t: Theme;
  onLongPress: () => void;
}) {
  const isFast = session.kind === 'fast';
  const end = session.ended_at ? new Date(session.ended_at).getTime() : now;
  const hours = (end - new Date(session.started_at).getTime()) / 3600_000;
  const hit = isFast && hours >= session.target_hours;
  return (
    <Pressable
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityHint="Long-press to delete"
      style={{ borderLeftWidth: 3, borderLeftColor: isFast ? t.fasting : t.eating, paddingLeft: spacing.sm }}
    >
      <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.xs }}>
        <View>
          <Body>
            {isFast ? 'Fast' : 'Eating'} · {formatDateTime(session.started_at)}
          </Body>
          <Body muted style={{ fontSize: 13 }}>
            {session.ended_at ? `→ ${formatDateTime(session.ended_at)}` : 'In progress'} ·{' '}
            {isFast ? 'goal' : 'window'} {formatHours(session.target_hours)}
          </Body>
        </View>
        <Body style={{ color: hit ? t.primary : t.textMuted, fontWeight: '600' }}>
          {formatHours(hours)} {hit ? '✓' : ''}
        </Body>
      </Row>
    </Pressable>
  );
}
