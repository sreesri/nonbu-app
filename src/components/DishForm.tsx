import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useDeleteDish, useSaveDish } from '@/api/hooks';
import type { Dish, DishInput } from '@/api/types';
import { tempId } from '@/api/writes';
import { itemFromDish } from '@/lib/nutrition';
import { deliverPicked } from '@/lib/pickedItems';
import { Body, Button, Field, Row, Screen } from './ui';

const NUMERIC = ['quantity', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const;
type NumericField = (typeof NUMERIC)[number];

type FormState = { name: string; unit: string } & Record<NumericField, string>;

function initialState(dish: Dish | undefined, name: string | undefined): FormState {
  const num = (v: number | null | undefined) => (v == null ? '' : String(v));
  return {
    name: dish?.name ?? name ?? '',
    unit: dish?.unit ?? '',
    ...(Object.fromEntries(NUMERIC.map((k) => [k, num(dish?.[k])])) as Record<NumericField, string>),
  };
}

function parseNumber(value: string): number | null {
  const n = Number(value.replace(',', '.'));
  return value.trim() === '' || Number.isNaN(n) ? null : n;
}

/**
 * Add a dish to the library, or edit one (`dish`). Nutrition is for one serving. `name` prefills
 * a new dish; `deliverTo` adds it to the meal being put together on the screen that asked for it.
 */
export function DishForm({ dish, name, deliverTo }: { dish?: Dish; name?: string; deliverTo?: string }) {
  const [form, setForm] = useState(() => initialState(dish, name));
  const save = useSaveDish();
  const remove = useDeleteDish();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const onSave = () => {
    const input: DishInput = {
      name: form.name.trim(),
      unit: form.unit.trim() || null,
      ...(Object.fromEntries(NUMERIC.map((k) => [k, parseNumber(form[k])])) as Record<NumericField, number | null>),
    };
    if (dish || !deliverTo) {
      save.mutate({ id: dish?.id, ...input });
    } else {
      // Created while picking dishes for a meal: it goes straight into that meal.
      const id = tempId();
      save.mutate({ ...input, tempId: id });
      deliverPicked(deliverTo, [itemFromDish({ ...input, id })]);
    }
    router.back();
  };

  const onDelete = () => {
    if (!dish) return;
    Alert.alert(`Delete ${dish.name}?`, 'It will also be removed from your saved meals. Logged meals keep it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove.mutate(dish.id);
          router.back();
        },
      },
    ]);
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
      <Field label="Dish" value={form.name} onChangeText={(v) => set('name', v)} placeholder="e.g. Idli" />

      <Body muted>One serving</Body>
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

      <Button title={dish ? 'Save changes' : 'Add dish'} onPress={onSave} disabled={!form.name.trim()} />
      {dish ? <Button title="Delete" variant="danger" onPress={onDelete} /> : null}
    </Screen>
  );
}
