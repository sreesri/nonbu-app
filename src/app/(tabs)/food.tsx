import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { useDailySummary, useFoodDay } from '@/api/hooks';
import { MEAL_TYPES } from '@/api/types';
import { MacroBar } from '@/components/MacroBar';
import { Body, Button, Card, ErrorText, Label, Loading, Row, Screen, Title } from '@/components/ui';
import { formatDayLabel, formatHours, formatTime, round, shiftDateKey, todayKey } from '@/lib/format';
import { spacing, useTheme } from '@/lib/theme';

export default function FoodScreen() {
  const t = useTheme();
  const [date, setDate] = useState(todayKey());
  const entries = useFoodDay(date);
  const summary = useDailySummary(date);
  const isToday = date === todayKey();

  const s = summary.data;
  const refreshing = entries.isRefetching || summary.isRefetching;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            entries.refetch();
            summary.refetch();
          }}
        />
      }
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <Button title="‹" variant="secondary" onPress={() => setDate(shiftDateKey(date, -1))} />
        <Title>{formatDayLabel(date)}</Title>
        <Button
          title="›"
          variant="secondary"
          disabled={isToday}
          onPress={() => setDate(shiftDateKey(date, 1))}
        />
      </Row>

      <Card>
        {s ? (
          <>
            <MacroBar
              label="Calories"
              value={s.totals.calories}
              goal={s.goals.daily_calories}
              unit="kcal"
              color={t.primary}
            />
            <MacroBar label="Protein" value={s.totals.protein_g} goal={s.goals.protein_g} unit="g" color={t.protein} />
            <MacroBar label="Carbs" value={s.totals.carbs_g} goal={s.goals.carbs_g} unit="g" color={t.carbs} />
            <MacroBar label="Fat" value={s.totals.fat_g} goal={s.goals.fat_g} unit="g" color={t.fat} />
            <Body muted>Fasted {formatHours(s.fasting_hours)} this day</Body>
          </>
        ) : (
          <Loading />
        )}
      </Card>

      <Button
        title="+ Add food"
        onPress={() => router.push({ pathname: '/food/new', params: { date } })}
      />

      <ErrorText error={entries.error ?? summary.error} />

      {entries.isPending ? (
        <Loading />
      ) : (
        MEAL_TYPES.map((meal) => {
          const items = entries.data?.filter((e) => e.meal_type === meal) ?? [];
          if (!items.length) return null;
          const kcal = items.reduce((sum, e) => sum + (e.calories ?? 0), 0);
          return (
            <Card key={meal}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Label>{meal}</Label>
                <Label muted>{Math.round(kcal)} kcal</Label>
              </Row>
              {items.map((e) => (
                <Link key={e.id} href={{ pathname: '/food/[id]', params: { id: String(e.id) } }} asChild>
                  <Pressable>
                    <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.xs }}>
                      <View style={{ flex: 1 }}>
                        <Body>
                          {e.name}
                          {e.quantity ? ` · ${e.quantity}${e.unit ? ` ${e.unit}` : ''}` : ''}
                        </Body>
                        <Body muted style={{ fontSize: 13 }}>
                          {formatTime(e.eaten_at)} · P {round(e.protein_g)} · C {round(e.carbs_g)} · F {round(e.fat_g)}
                        </Body>
                      </View>
                      <Body style={{ fontWeight: '600' }}>{round(e.calories)}</Body>
                    </Row>
                  </Pressable>
                </Link>
              ))}
            </Card>
          );
        })
      )}
      {entries.data?.length === 0 ? <Body muted>Nothing logged for this day.</Body> : null}
    </Screen>
  );
}
