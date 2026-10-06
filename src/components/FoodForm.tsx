import { parseISO } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useDeleteFood, useRecentFood, useSaveFood } from '@/api/hooks';
import { MEAL_TYPES, type FoodEntry, type MealType } from '@/api/types';
import { todayKey } from '@/lib/format';
import { spacing } from '@/lib/theme';
import { DateTimeField } from './DateTimeField';
import { Button, Chip, Field, Label, Row, Screen } from './ui';

const NUMERIC = ['quantity', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const;
type NumericField = (typeof NUMERIC)[number];

type FormState = {
  name: string;
  meal_type: MealType;
  eaten_at: Date;
  unit: string;
  notes: string;
} & Record<NumericField, string>;

function guessMeal(date: Date): MealType {
  const h = date.getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h >= 18 && h < 23) return 'dinner';
  return 'snack';
}

function initialState(entry: FoodEntry | undefined, date: string | undefined): FormState {
  let eatenAt = entry ? new Date(entry.eaten_at) : new Date();
  if (!entry && date && date !== todayKey()) {
    // Logging for a past day: default to noon that day.
    eatenAt = parseISO(`${date}T12:00:00`);
  }
  const num = (v: number | null | undefined) => (v == null ? '' : String(v));
  return {
    name: entry?.name ?? '',
    meal_type: entry?.meal_type ?? guessMeal(eatenAt),
    eaten_at: eatenAt,
    unit: entry?.unit ?? '',
    notes: entry?.notes ?? '',
    quantity: num(entry?.quantity),
    calories: num(entry?.calories),
    protein_g: num(entry?.protein_g),
    carbs_g: num(entry?.carbs_g),
    fat_g: num(entry?.fat_g),
    fiber_g: num(entry?.fiber_g),
  };
}

function parseNumber(value: string): number | null {
  const n = Number(value.replace(',', '.'));
  return value.trim() === '' || Number.isNaN(n) ? null : n;
}

export function FoodForm({ entry, date }: { entry?: FoodEntry; date?: string }) {
  const [form, setForm] = useState(() => initialState(entry, date));
  const save = useSaveFood();
  const remove = useDeleteFood();
  const recent = useRecentFood();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const applyRecent = (r: FoodEntry) =>
    setForm((f) => ({
      ...f,
      name: r.name,
      unit: r.unit ?? '',
      quantity: r.quantity == null ? '' : String(r.quantity),
      calories: r.calories == null ? '' : String(r.calories),
      protein_g: r.protein_g == null ? '' : String(r.protein_g),
      carbs_g: r.carbs_g == null ? '' : String(r.carbs_g),
      fat_g: r.fat_g == null ? '' : String(r.fat_g),
      fiber_g: r.fiber_g == null ? '' : String(r.fiber_g),
    }));

  const onSave = () => {
    if (!form.name.trim()) return;
    save.mutate(
      {
        id: entry?.id,
        name: form.name.trim(),
        meal_type: form.meal_type,
        eaten_at: form.eaten_at.toISOString(),
        unit: form.unit.trim() || null,
        notes: form.notes.trim() || null,
        ...Object.fromEntries(NUMERIC.map((k) => [k, parseNumber(form[k])])),
      },
    );
    router.back();
  };

  const onDelete = () => {
    if (!entry) return;
    remove.mutate(entry.id);
    router.back();
  };

  const numberField = (key: NumericField, label: string) => (
    <Field
      label={label}
      value={form[key]}
      onChangeText={(v) => set(key, v)}
      keyboardType="decimal-pad"
      placeholder="0"
    />
  );

  return (
    <Screen safeTop={false}>
      {!entry && recent.data?.length ? (
        <View style={{ gap: spacing.sm }}>
          <Label muted>Recent</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {recent.data.map((r) => (
              <Chip key={r.id} label={r.name} selected={form.name === r.name} onPress={() => applyRecent(r)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Field label="Food" value={form.name} onChangeText={(v) => set('name', v)} placeholder="e.g. Idli with sambar" />

      <View style={{ gap: spacing.sm }}>
        <Label muted>Meal</Label>
        <Row style={{ flexWrap: 'wrap' }}>
          {MEAL_TYPES.map((m) => (
            <Chip key={m} label={m} selected={form.meal_type === m} onPress={() => set('meal_type', m)} />
          ))}
        </Row>
      </View>

      <DateTimeField label="Eaten at" value={form.eaten_at} onChange={(d) => set('eaten_at', d)} maximumDate={new Date()} />

      <Row style={{ alignItems: 'flex-start' }}>
        {numberField('quantity', 'Quantity')}
        <Field label="Unit" value={form.unit} onChangeText={(v) => set('unit', v)} placeholder="g, cup, pc" />
      </Row>
      <Row style={{ alignItems: 'flex-start' }}>
        {numberField('calories', 'Calories')}
        {numberField('protein_g', 'Protein g')}
      </Row>
      <Row style={{ alignItems: 'flex-start' }}>
        {numberField('carbs_g', 'Carbs g')}
        {numberField('fat_g', 'Fat g')}
      </Row>
      <Row style={{ alignItems: 'flex-start' }}>
        {numberField('fiber_g', 'Fiber g')}
        <View style={{ flex: 1 }} />
      </Row>
      <Field label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} multiline />

      <Button title={entry ? 'Save changes' : 'Add'} onPress={onSave} disabled={!form.name.trim()} />
      {entry ? <Button title="Delete" variant="danger" onPress={onDelete} /> : null}
    </Screen>
  );
}
