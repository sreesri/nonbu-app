import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useDishes, useSavedMeals } from '@/api/hooks';
import type { LibraryDish, MealItem } from '@/api/types';
import { isUnsynced } from '@/api/writes';
import { round } from '@/lib/format';
import { formatMacros, formatServing, itemFromDish, mealTotals, recentDishes, searchDishes } from '@/lib/nutrition';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Body, Chip, Field, Label, Row } from './ui';

const SERVING_STEP = 0.5;
const MAX_SUGGESTIONS = 5;

/** Adds each item, or more servings of it when its dish is already in the meal. */
function mergeItems(items: MealItem[], added: MealItem[]): MealItem[] {
  const merged = [...items];
  for (const item of added) {
    const i = item.dish_id === null ? -1 : merged.findIndex((m) => m.dish_id === item.dish_id);
    if (i === -1) merged.push(item);
    else merged[i] = { ...merged[i], servings: merged[i].servings + item.servings };
  }
  return merged;
}

/**
 * Builds a meal from the library. Type a dish name and pick a suggestion (Enter adds the top
 * one); with nothing typed it suggests recent dishes. A name with no match can be created as a
 * new dish. Shows the meal's total nutrition, the sum of its dishes times their servings.
 */
export function MealBuilder({
  items,
  onChange,
  showSavedMeals = true,
  searchable = true,
  syncedDishesOnly = false,
}: {
  items: MealItem[];
  onChange: (items: MealItem[]) => void;
  showSavedMeals?: boolean;
  /** Off inside bottom sheets, where the keyboard would cover the sheet: dishes are then a
   * row of chips, most recent first. */
  searchable?: boolean;
  /** Saved meals link to dishes by id, so they can't use a dish the server hasn't created yet. */
  syncedDishesOnly?: boolean;
}) {
  const dishes = useDishes();
  const savedMeals = useSavedMeals();
  const [query, setQuery] = useState('');

  const library = (dishes.data ?? []).filter((d) => !(syncedDishesOnly && isUnsynced(d)));
  const libraryEmpty = dishes.isSuccess && library.length === 0;
  const q = query.trim();
  const inMeal = (d: LibraryDish) => items.some((i) => i.dish_id === d.id);
  const suggestions = q
    ? searchDishes(library, q).slice(0, MAX_SUGGESTIONS)
    : recentDishes(library.filter((d) => !inMeal(d))).slice(0, MAX_SUGGESTIONS);
  const exactMatch = library.some((d) => d.name.trim().toLowerCase() === q.toLowerCase());
  const anyEaten = library.some((d) => d.last_eaten_at);

  const add = (dish: LibraryDish) => {
    onChange(mergeItems(items, [itemFromDish(dish)]));
    setQuery('');
  };
  // The query stays, so the new dish is the top suggestion when the user comes back.
  const create = () => router.push({ pathname: '/library/dish/new', params: { name: q } });
  const onSubmit = () => {
    if (suggestions.length) add(suggestions[0]);
    else if (q) create();
  };

  const setServings = (index: number, servings: number) =>
    onChange(items.map((item, i) => (i === index ? { ...item, servings } : item)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const totals = mealTotals(items);

  return (
    <View style={{ gap: spacing.md }}>
      {showSavedMeals && savedMeals.data?.length ? (
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

      {!searchable ? (
        libraryEmpty ? (
          <Body muted>Your library has no dishes yet. Add some under Meals → Library.</Body>
        ) : (
          <ChipRow label="Dishes">
            {recentDishes(library).map((d) => (
              <Chip key={d.id} label={d.name} selected={inMeal(d)} onPress={() => add(d)} />
            ))}
          </ChipRow>
        )
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Field
            label="Add a dish"
            value={query}
            onChangeText={setQuery}
            placeholder={libraryEmpty ? 'Name of your first dish' : 'Start typing a dish name'}
            returnKeyType="done"
            // Keeps the keyboard up after Enter, ready for the next dish.
            submitBehavior="submit"
            onSubmitEditing={onSubmit}
            autoCorrect={false}
          />
          {!q && suggestions.length ? <Label muted>{anyEaten ? 'Recent' : 'Your dishes'}</Label> : null}
          {suggestions.length || q ? (
            <View>
              {suggestions.map((d, i) => (
                <SuggestionRow key={d.id} dish={d} highlighted={q !== '' && i === 0} onPress={() => add(d)} />
              ))}
              {q && !exactMatch ? <CreateRow name={q} onPress={create} /> : null}
            </View>
          ) : null}
        </View>
      )}

      {items.length ? <Label muted>In this meal</Label> : null}
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

/** A suggested dish; the highlighted one is what Enter adds. */
function SuggestionRow({ dish, highlighted, onPress }: { dish: LibraryDish; highlighted: boolean; onPress: () => void }) {
  const t = useTheme();
  const serving = formatServing(dish.quantity, dish.unit);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${dish.name}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.sm,
        backgroundColor: highlighted || pressed ? t.button.secondary.bg : 'transparent',
      })}
    >
      <View style={{ flex: 1 }}>
        <Body>{dish.name}</Body>
        <Body muted style={{ fontSize: 13 }}>
          {serving ? `${serving} · ` : ''}
          {round(dish.calories ?? 0)} kcal
        </Body>
      </View>
      <Text style={{ color: t.primary, fontSize: 20, fontWeight: '600' }}>+</Text>
    </Pressable>
  );
}

function CreateRow({ name, onPress }: { name: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, opacity: pressed ? 0.7 : 1 })}
    >
      <Text style={{ color: t.primary, fontWeight: '600' }}>+ Create “{name}”</Text>
      <Body muted style={{ fontSize: 13 }}>
        New dish in your library
      </Body>
    </Pressable>
  );
}

function ItemRow({
  item,
  onServings,
  onRemove,
}: {
  item: MealItem;
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
