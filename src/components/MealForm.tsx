import { parseISO } from 'date-fns';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDeleteMeal, useSaveMeal } from '@/api/hooks';
import { MEAL_TYPES, type Meal, type MealItem, type MealType } from '@/api/types';
import { todayKey } from '@/lib/format';
import { guessMealType, mealTotals, mergeItems } from '@/lib/nutrition';
import { usePickedItems } from '@/lib/pickedItems';
import { spacing, useTheme } from '@/lib/theme';
import { DateTimeField } from './DateTimeField';
import { MealItemList } from './MealItemRow';
import { MealTotalsHeader } from './MealTotalsHeader';
import { Body, Button, Chip, Field, Label, Row } from './ui';

function initialEatenAt(meal: Meal | undefined, date: string | undefined): Date {
  if (meal) return new Date(meal.eaten_at);
  // Logging for a past day: default to noon that day.
  if (date && date !== todayKey()) return parseISO(`${date}T12:00:00`);
  return new Date();
}

/**
 * Log a new meal, or edit a logged one (`meal`). The meal's totals stay at the top; dishes come
 * from the dish and saved-meal library screens, and the save button stays at the bottom.
 */
export function MealForm({ meal, date }: { meal?: Meal; date?: string }) {
  const t = useTheme();
  const [eatenAt, setEatenAt] = useState(() => initialEatenAt(meal, date));
  const [mealType, setMealType] = useState<MealType>(() => meal?.meal_type ?? guessMealType(eatenAt));
  const [name, setName] = useState(meal?.name ?? '');
  const [notes, setNotes] = useState(meal?.notes ?? '');
  const [showDetails, setShowDetails] = useState(Boolean(meal?.name || meal?.notes));
  const [items, setItems] = useState<MealItem[]>(
    // Meals cached before items carried their dish have no `dish_id`.
    () => meal?.items.map((i) => ({ ...i, dish_id: i.dish_id ?? null })) ?? [],
  );
  const save = useSaveMeal();
  const remove = useDeleteMeal();
  const pickerFor = usePickedItems(useCallback((picked: MealItem[]) => setItems((current) => mergeItems(current, picked)), []));

  const onSave = () => {
    save.mutate({
      id: meal?.id,
      eaten_at: eatenAt.toISOString(),
      meal_type: mealType,
      name: name.trim() || null,
      notes: notes.trim() || null,
      items,
    });
    router.back();
  };

  const onDelete = () => {
    if (!meal) return;
    remove.mutate(meal.id);
    router.back();
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: t.background }}>
      <MealTotalsHeader totals={mealTotals(items)} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: spacing.sm }}>
          <Label muted>Meal</Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {MEAL_TYPES.map((m) => (
              <Chip key={m} label={m} selected={mealType === m} onPress={() => setMealType(m)} />
            ))}
          </Row>
        </View>

        <DateTimeField label="Eaten at" value={eatenAt} onChange={setEatenAt} maximumDate={new Date()} />

        <View style={{ gap: spacing.sm }}>
          <Label muted>In this meal</Label>
          {items.length ? (
            <MealItemList items={items} onChange={setItems} />
          ) : (
            <Body muted>Add dishes one at a time, or a saved meal you eat often.</Body>
          )}
          <Row>
            <Button
              title="+ Add dish"
              variant="secondary"
              onPress={() => router.push({ pathname: '/pick/dish', params: { for: pickerFor } })}
              style={{ flex: 1 }}
            />
            <Button
              title="+ Add meal"
              variant="secondary"
              onPress={() => router.push({ pathname: '/pick/meal', params: { for: pickerFor } })}
              style={{ flex: 1 }}
            />
          </Row>
        </View>

        {showDetails ? (
          <>
            <Field label="Name (optional)" value={name} onChangeText={setName} placeholder="e.g. Sunday lunch" />
            <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
          </>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setShowDetails(true)} hitSlop={spacing.sm}>
            <Text style={{ color: t.primary, fontWeight: '600' }}>+ Add a name or notes</Text>
          </Pressable>
        )}

        {meal ? <Button title="Delete meal" variant="danger" onPress={onDelete} /> : null}
      </ScrollView>

      <View
        style={{
          padding: spacing.lg,
          paddingTop: spacing.md,
          backgroundColor: t.card.bg,
          borderTopColor: t.card.border,
          borderTopWidth: 1,
        }}
      >
        <Button
          title={items.length ? (meal ? 'Save changes' : 'Log meal') : 'Add a dish to log this meal'}
          onPress={onSave}
          disabled={!items.length}
        />
      </View>
    </SafeAreaView>
  );
}
