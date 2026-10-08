import { router } from 'expo-router';
import { useState } from 'react';

import { useDeleteSavedMeal, useSaveSavedMeal } from '@/api/hooks';
import type { SavedMeal } from '@/api/types';
import { itemFromDish } from '@/lib/nutrition';
import { MealBuilder, type DraftItem } from './MealBuilder';
import { Button, Field, Screen } from './ui';

/** Create a saved meal from library dishes, or edit one (`meal`). */
export function SavedMealForm({ meal }: { meal?: SavedMeal }) {
  const [name, setName] = useState(meal?.name ?? '');
  const [items, setItems] = useState<DraftItem[]>(
    () => meal?.items.map((i) => ({ ...itemFromDish(i.dish, i.servings), dishId: i.dish.id })) ?? [],
  );
  const save = useSaveSavedMeal();
  const remove = useDeleteSavedMeal();

  const onSave = () => {
    save.mutate({
      id: meal?.id,
      name: name.trim(),
      // Every item here was picked from the library, so each has a dish id.
      items: items.flatMap((i) => (i.dishId === undefined ? [] : [{ dish_id: i.dishId, servings: i.servings }])),
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
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Idli breakfast" />
      <MealBuilder items={items} onChange={setItems} showSavedMeals={false} syncedDishesOnly />
      <Button title="+ New dish" variant="secondary" onPress={() => router.push('/library/dish/new')} />
      <Button
        title={meal ? 'Save changes' : 'Save meal'}
        onPress={onSave}
        disabled={!name.trim() || !items.length}
      />
      {meal ? <Button title="Delete" variant="danger" onPress={onDelete} /> : null}
    </Screen>
  );
}
