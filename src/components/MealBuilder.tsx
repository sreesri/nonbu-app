import { ScrollView, View } from 'react-native';

import { useDishes, useSavedMeals } from '@/api/hooks';
import type { MealItem } from '@/api/types';
import { round } from '@/lib/format';
import { formatMacros, itemFromDish, mealTotals, mergeItems, recentDishes } from '@/lib/nutrition';
import { spacing } from '@/lib/theme';
import { MealItemList } from './MealItemRow';
import { Body, Chip, Label, Row } from './ui';

/**
 * A compact meal builder for the start/end-fast sheet, where a keyboard or another screen would
 * cover the time picker: saved meals and dishes (most recent first) as chips, then servings and
 * the meal's total. The Log meal screen uses the full library pickers instead.
 */
export function MealBuilder({ items, onChange }: { items: MealItem[]; onChange: (items: MealItem[]) => void }) {
  const dishes = useDishes();
  const savedMeals = useSavedMeals();
  const totals = mealTotals(items);

  return (
    <View style={{ gap: spacing.md }}>
      {savedMeals.data?.length ? (
        <ChipRow label="Saved meals">
          {savedMeals.data.map((m) => (
            <Chip
              key={m.id}
              label={m.name}
              selected={false}
              onPress={() => onChange(mergeItems(items, m.items.map((i) => itemFromDish(i.dish, i.servings))))}
            />
          ))}
        </ChipRow>
      ) : null}

      {dishes.isSuccess && dishes.data.length === 0 ? (
        <Body muted>Your library has no dishes yet. Add some under Meals → Library.</Body>
      ) : (
        <ChipRow label="Dishes">
          {recentDishes(dishes.data ?? []).map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              selected={items.some((i) => i.dish_id === d.id)}
              onPress={() => onChange(mergeItems(items, [itemFromDish(d)]))}
            />
          ))}
        </ChipRow>
      )}

      <MealItemList items={items} onChange={onChange} />

      {items.length ? (
        <View style={{ gap: spacing.xs }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>Total</Label>
            <Label>{round(totals.calories)} kcal</Label>
          </Row>
          <Body muted style={{ fontSize: 13 }}>
            {formatMacros(totals)}
          </Body>
        </View>
      ) : null}
    </View>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Label muted>{label}</Label>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
