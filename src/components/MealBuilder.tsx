import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useDishes, useSavedMeals } from '@/api/hooks';
import type { Dish, MealItem } from '@/api/types';
import { isUnsynced } from '@/api/writes';
import { round } from '@/lib/format';
import { formatMacros, formatServing, itemFromDish, mealTotals } from '@/lib/nutrition';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Body, Chip, Field, Label, Row } from './ui';

/** A meal item while it's being put together; `dishId` links it back to its library dish. */
export type DraftItem = MealItem & { dishId?: number };

const SERVING_STEP = 0.5;

/** Adds each item, or more servings of it when its dish is already in the meal. */
function mergeItems(items: DraftItem[], added: DraftItem[]): DraftItem[] {
  const merged = [...items];
  for (const item of added) {
    const i = item.dishId === undefined ? -1 : merged.findIndex((m) => m.dishId === item.dishId);
    if (i === -1) merged.push(item);
    else merged[i] = { ...merged[i], servings: merged[i].servings + item.servings };
  }
  return merged;
}

function fromDish(dish: Dish, servings = 1): DraftItem {
  return { ...itemFromDish(dish, servings), dishId: dish.id };
}

/**
 * Builds a meal from the library: tap saved meals and dishes to add them, then adjust servings.
 * Shows the meal's total nutrition, the sum of its dishes times their servings.
 */
export function MealBuilder({
  items,
  onChange,
  showSavedMeals = true,
  searchable = true,
  syncedDishesOnly = false,
}: {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  showSavedMeals?: boolean;
  /** Off inside bottom sheets, where the keyboard would cover the sheet. */
  searchable?: boolean;
  /** Saved meals link to dishes by id, so they can't use a dish the server hasn't created yet. */
  syncedDishesOnly?: boolean;
}) {
  const dishes = useDishes();
  const savedMeals = useSavedMeals();
  const [query, setQuery] = useState('');

  const matches = (name: string) => name.toLowerCase().includes(query.trim().toLowerCase());
  const dishOptions = (dishes.data ?? []).filter((d) => matches(d.name) && !(syncedDishesOnly && isUnsynced(d)));
  const mealOptions = showSavedMeals ? (savedMeals.data ?? []).filter((m) => matches(m.name)) : [];
  const libraryEmpty = dishes.isSuccess && dishes.data.length === 0;

  const setServings = (index: number, servings: number) =>
    onChange(items.map((item, i) => (i === index ? { ...item, servings } : item)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const totals = mealTotals(items);

  return (
    <View style={{ gap: spacing.md }}>
      {searchable && !libraryEmpty ? (
        <Field label="Search library" value={query} onChangeText={setQuery} placeholder="Dish or meal name" />
      ) : null}

      {mealOptions.length ? (
        <ChipRow label="Saved meals">
          {mealOptions.map((m) => (
            <Chip
              key={m.id}
              label={m.name}
              selected={false}
              onPress={() => onChange(mergeItems(items, m.items.map((i) => fromDish(i.dish, i.servings))))}
            />
          ))}
        </ChipRow>
      ) : null}

      {libraryEmpty ? (
        <Body muted>Your library has no dishes yet. Add some under Meals → Library.</Body>
      ) : (
        <ChipRow label="Dishes">
          {dishOptions.map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              selected={items.some((i) => i.dishId === d.id)}
              onPress={() => onChange(mergeItems(items, [fromDish(d)]))}
            />
          ))}
        </ChipRow>
      )}

      {items.map((item, i) => (
        <ItemRow
          // Items have no ids of their own; the position is stable while the list is edited in place.
          key={i}
          item={item}
          onServings={(servings) => setServings(i, servings)}
          onRemove={() => remove(i)}
        />
      ))}

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

function ItemRow({
  item,
  onServings,
  onRemove,
}: {
  item: DraftItem;
  onServings: (servings: number) => void;
  onRemove: () => void;
}) {
  const serving = formatServing(item.quantity, item.unit);
  const kcal = (item.calories ?? 0) * item.servings;
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Body>{item.name}</Body>
        <Body muted style={{ fontSize: 13 }}>
          {serving ? `${serving} · ` : ''}
          {round(kcal)} kcal
        </Body>
      </View>
      <SmallButton
        label="−"
        accessibilityLabel={`Fewer servings of ${item.name}`}
        disabled={item.servings <= SERVING_STEP}
        onPress={() => onServings(item.servings - SERVING_STEP)}
      />
      <Body style={{ minWidth: 32, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{item.servings}×</Body>
      <SmallButton
        label="+"
        accessibilityLabel={`More servings of ${item.name}`}
        onPress={() => onServings(item.servings + SERVING_STEP)}
      />
      <SmallButton label="✕" accessibilityLabel={`Remove ${item.name}`} onPress={onRemove} />
    </Row>
  );
}

function SmallButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.button.secondary.bg,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: t.button.secondary.fg, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/** The API's shape for an item: drops the client-only library link. */
export function toMealItem({ dishId: _dishId, ...item }: DraftItem): MealItem {
  return item;
}
