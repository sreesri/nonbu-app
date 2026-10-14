import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useDeleteSavedMeal, useSaveSavedMeal } from '@/api/hooks';
import type { MealItem, SavedMeal } from '@/api/types';
import { itemFromDish, mergeItems } from '@/lib/nutrition';
import { deliverPicked, usePickedItems } from '@/lib/pickedItems';
import { spacing } from '@/lib/theme';
import { MealItemList } from './MealItemRow';
import { Body, Button, Field, Label, Screen } from './ui';

/**
 * Create a saved meal from library dishes, or edit one (`meal`). `name` prefills a new meal;
 * `deliverTo` also adds its dishes to the meal being logged on the screen that asked for it.
 */
export function SavedMealForm({ meal, name: initialName, deliverTo }: { meal?: SavedMeal; name?: string; deliverTo?: string }) {
  const [name, setName] = useState(meal?.name ?? initialName ?? '');
  const [items, setItems] = useState<MealItem[]>(() => meal?.items.map((i) => itemFromDish(i.dish, i.servings)) ?? []);
  const save = useSaveSavedMeal();
  const remove = useDeleteSavedMeal();
  const pickerFor = usePickedItems(useCallback((picked: MealItem[]) => setItems((current) => mergeItems(current, picked)), []));

  const onSave = () => {
    save.mutate({
      id: meal?.id,
      name: name.trim(),
      // The dish picker only offers synced dishes here, so each item has a server dish id.
      items: items.flatMap((i) => (i.dish_id === null ? [] : [{ dish_id: i.dish_id, servings: i.servings }])),
    });
    if (deliverTo) deliverPicked(deliverTo, items);
    router.back();
  };

  const onDelete = () => {
    if (!meal) return;
    remove.mutate(meal.id);
    router.back();
  };

  return (
    <Screen safeTop={false}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Idli breakfast" />
      <View style={{ gap: spacing.sm }}>
        <Label muted>Dishes</Label>
        {items.length ? (
          <MealItemList items={items} onChange={setItems} />
        ) : (
          <Body muted>Add the dishes you usually eat together.</Body>
        )}
        <Button
          title="+ Add dish"
          variant="secondary"
          onPress={() => router.push({ pathname: '/pick/dish', params: { for: pickerFor, synced: '1' } })}
        />
      </View>
      <Button
        title={meal ? 'Save changes' : deliverTo ? 'Save and add to meal' : 'Save meal'}
        onPress={onSave}
        disabled={!name.trim() || !items.length}
      />
      {meal ? <Button title="Delete" variant="danger" onPress={onDelete} /> : null}
    </Screen>
  );
}
