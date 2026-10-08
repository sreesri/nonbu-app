import { parseISO } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useDeleteMeal, useSaveMeal } from '@/api/hooks';
import { MEAL_TYPES, type Meal, type MealType } from '@/api/types';
import { todayKey } from '@/lib/format';
import { guessMealType } from '@/lib/nutrition';
import { spacing } from '@/lib/theme';
import { DateTimeField } from './DateTimeField';
import { MealBuilder, toMealItem, type DraftItem } from './MealBuilder';
import { Button, Chip, Field, Label, Row, Screen } from './ui';

function initialEatenAt(meal: Meal | undefined, date: string | undefined): Date {
  if (meal) return new Date(meal.eaten_at);
  // Logging for a past day: default to noon that day.
  if (date && date !== todayKey()) return parseISO(`${date}T12:00:00`);
  return new Date();
}

/** Log a new meal, or edit a logged one (`meal`). */
export function MealForm({ meal, date }: { meal?: Meal; date?: string }) {
  const [eatenAt, setEatenAt] = useState(() => initialEatenAt(meal, date));
  const [mealType, setMealType] = useState<MealType>(() => meal?.meal_type ?? guessMealType(eatenAt));
  const [name, setName] = useState(meal?.name ?? '');
  const [notes, setNotes] = useState(meal?.notes ?? '');
  const [items, setItems] = useState<DraftItem[]>(meal?.items ?? []);
  const save = useSaveMeal();
  const remove = useDeleteMeal();

  const onSave = () => {
    save.mutate({
      id: meal?.id,
      eaten_at: eatenAt.toISOString(),
      meal_type: mealType,
      name: name.trim() || null,
      notes: notes.trim() || null,
      items: items.map(toMealItem),
    });
    router.back();
  };

  const onDelete = () => {
    if (!meal) return;
    remove.mutate(meal.id);
    router.back();
  };

  return (
    <Screen safeTop={false}>
      <View style={{ gap: spacing.sm }}>
        <Label muted>Meal</Label>
        <Row style={{ flexWrap: 'wrap' }}>
          {MEAL_TYPES.map((m) => (
            <Chip key={m} label={m} selected={mealType === m} onPress={() => setMealType(m)} />
          ))}
        </Row>
      </View>

      <DateTimeField label="Eaten at" value={eatenAt} onChange={setEatenAt} maximumDate={new Date()} />

      <MealBuilder items={items} onChange={setItems} />
      <Button title="+ New dish" variant="secondary" onPress={() => router.push('/library/dish/new')} />

      <Field label="Name (optional)" value={name} onChangeText={setName} placeholder="e.g. Sunday lunch" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />

      <Button title={meal ? 'Save changes' : 'Log meal'} onPress={onSave} disabled={!items.length} />
      {meal ? <Button title="Delete" variant="danger" onPress={onDelete} /> : null}
    </Screen>
  );
}
