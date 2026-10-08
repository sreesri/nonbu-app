import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { useDailySummary, useMealsDay } from '@/api/hooks';
import type { Meal } from '@/api/types';
import { isUnsynced } from '@/api/writes';
import { MacroBar } from '@/components/MacroBar';
import { Body, Button, Card, ErrorText, Label, Loading, Row, Screen, Title } from '@/components/ui';
import { formatDayLabel, formatHours, formatTime, round, shiftDateKey, todayKey } from '@/lib/format';
import { formatMacros, formatServing } from '@/lib/nutrition';
import { useTheme } from '@/lib/theme';

function MealCard({ meal }: { meal: Meal }) {
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Label>{meal.name ?? meal.meal_type}</Label>
          <Body muted style={{ fontSize: 13 }}>
            {isUnsynced(meal) ? 'Syncing… · ' : ''}
            {meal.name ? `${meal.meal_type} · ` : ''}
            {formatTime(meal.eaten_at)}
          </Body>
        </View>
        <Label>{round(meal.totals.calories)} kcal</Label>
      </Row>
      {meal.items.map((item, i) => {
        const serving = formatServing(item.quantity, item.unit);
        return (
          // Items have no ids of their own and are only ever replaced as a whole.
          <Row key={i} style={{ justifyContent: 'space-between' }}>
            <Body style={{ flex: 1 }}>
              {item.name}
              <Body muted>
                {' '}
                · {item.servings}×{serving ? ` ${serving}` : ''}
              </Body>
            </Body>
            <Body muted>{round((item.calories ?? 0) * item.servings)}</Body>
          </Row>
        );
      })}
      <Body muted style={{ fontSize: 13 }}>
        {formatMacros(meal.totals)}
      </Body>
    </Card>
  );
}

export default function MealsScreen() {
  const t = useTheme();
  const [date, setDate] = useState(todayKey());
  const meals = useMealsDay(date);
  const summary = useDailySummary(date);
  const isToday = date === todayKey();

  const s = summary.data;
  const refreshing = meals.isRefetching || summary.isRefetching;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            meals.refetch();
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
            <MacroBar label="Fiber" value={s.totals.fiber_g} goal={s.goals.fiber_g} unit="g" color={t.fiber} />
            <Body muted>Fasted {formatHours(s.fasting_hours)} this day</Body>
          </>
        ) : (
          <Loading />
        )}
      </Card>

      <Row>
        <Button
          title="+ Log meal"
          onPress={() => router.push({ pathname: '/meal/new', params: { date } })}
          style={{ flex: 2 }}
        />
        <Button title="Library" variant="secondary" onPress={() => router.push('/library')} style={{ flex: 1 }} />
      </Row>

      <ErrorText error={meals.error ?? summary.error} />

      {meals.isPending ? (
        <Loading />
      ) : (
        meals.data?.map((meal) =>
          // Meals logged offline can't be opened until the server has given them an id.
          isUnsynced(meal) ? (
            <MealCard key={meal.id} meal={meal} />
          ) : (
            <Link key={meal.id} href={{ pathname: '/meal/[id]', params: { id: String(meal.id) } }} asChild>
              <Pressable accessibilityRole="button">
                <MealCard meal={meal} />
              </Pressable>
            </Link>
          ),
        )
      )}
      {meals.data?.length === 0 ? <Body muted>No meals logged for this day.</Body> : null}
    </Screen>
  );
}
