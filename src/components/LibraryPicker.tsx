import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDishes, useSavedMeals } from '@/api/hooks';
import type { LibraryDish, SavedMeal } from '@/api/types';
import { isUnsynced } from '@/api/writes';
import { round } from '@/lib/format';
import { formatMacros, formatServing, itemFromDish, recentDishes, searchDishes } from '@/lib/nutrition';
import { deliverPicked } from '@/lib/pickedItems';
import { radius, spacing, useTheme } from '@/lib/theme';
import { Body, Field, Label, QueryFallback } from './ui';

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The dish library as a picker: search, tap a dish to add it to the meal that opened this
 * screen (`deliverTo`), or create one. `syncedOnly` is for saved meals, which link to dishes by
 * id and so can't use a dish the server hasn't created yet; a dish created there comes back to
 * this list rather than straight into the meal.
 */
export function DishPicker({ deliverTo, syncedOnly }: { deliverTo: string; syncedOnly: boolean }) {
  const dishes = useDishes();
  const [query, setQuery] = useState('');
  const q = query.trim();
  const library = dishes.data ?? [];
  const shown = q ? searchDishes(library, q) : recentDishes(library);
  const canCreate = !q || !library.some((d) => sameName(d.name, q));

  const pick = (dish: LibraryDish) => {
    deliverPicked(deliverTo, [itemFromDish(dish)]);
    router.back();
  };
  const create = () => {
    const params = { name: q };
    if (syncedOnly) router.push({ pathname: '/library/dish/new', params });
    // Replaces this picker, so saving the dish returns straight to the meal with it added.
    else router.replace({ pathname: '/library/dish/new', params: { ...params, for: deliverTo } });
  };

  return (
    <PickerLayout
      query={query}
      onQuery={setQuery}
      placeholder="Search your dishes"
      fallback={dishes.data ? null : <QueryFallback error={dishes.error} onRetry={() => dishes.refetch()} />}
      createLabel={q ? `Create “${q}”` : 'New dish'}
      onCreate={canCreate ? create : undefined}
      heading={q ? null : library.some((d) => d.last_eaten_at) ? 'Recent first' : 'Your dishes'}
      empty={q ? `No dishes match “${q}”.` : 'Your library has no dishes yet. Create your first one above.'}
      data={shown}
      keyOf={(d) => d.id}
      renderRow={(d) => {
        const waiting = syncedOnly && isUnsynced(d);
        const serving = formatServing(d.quantity, d.unit);
        return (
          <PickerRow
            title={d.name}
            detail={
              waiting
                ? 'Syncing… you can add it in a moment'
                : `${serving ? `${serving} · ` : ''}${round(d.calories)} kcal · ${formatMacros(d)}`
            }
            disabled={waiting}
            onPress={() => pick(d)}
          />
        );
      }}
    />
  );
}

/** The saved-meal library as a picker: tapping a meal adds all its dishes to the meal being logged. */
export function SavedMealPicker({ deliverTo }: { deliverTo: string }) {
  const meals = useSavedMeals();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const library = meals.data ?? [];
  // Matches the meal's name or any of its dishes, so "idli" finds "South Indian breakfast".
  const shown = q
    ? library.filter((m) => m.name.toLowerCase().includes(q) || m.items.some((i) => i.dish.name.toLowerCase().includes(q)))
    : library;
  const canCreate = !q || !library.some((m) => sameName(m.name, q));

  const pick = (meal: SavedMeal) => {
    deliverPicked(
      deliverTo,
      meal.items.map((i) => itemFromDish(i.dish, i.servings)),
    );
    router.back();
  };
  const create = () =>
    router.replace({ pathname: '/library/meal/new', params: { name: query.trim(), for: deliverTo } });

  return (
    <PickerLayout
      query={query}
      onQuery={setQuery}
      placeholder="Search meals or the dishes in them"
      fallback={meals.data ? null : <QueryFallback error={meals.error} onRetry={() => meals.refetch()} />}
      createLabel={q ? `Create “${query.trim()}”` : 'New saved meal'}
      onCreate={canCreate ? create : undefined}
      heading={null}
      empty={
        q
          ? `No saved meals match “${query.trim()}”.`
          : 'No saved meals yet. Save a combination of dishes you eat often, then add it in one tap.'
      }
      data={shown}
      keyOf={(m) => m.id}
      renderRow={(m) => (
        <PickerRow
          title={m.name}
          detail={`${m.items.map((i) => (i.servings === 1 ? i.dish.name : `${i.dish.name} ×${i.servings}`)).join(', ')} · ${round(m.totals.calories)} kcal`}
          onPress={() => pick(m)}
        />
      )}
    />
  );
}

function PickerLayout<T>({
  query,
  onQuery,
  placeholder,
  fallback,
  createLabel,
  onCreate,
  heading,
  empty,
  data,
  keyOf,
  renderRow,
}: {
  query: string;
  onQuery: (query: string) => void;
  placeholder: string;
  /** Shown instead of the list until the library has loaded. */
  fallback: ReactNode;
  createLabel: string;
  /** Omitted when what was typed already exists. */
  onCreate?: () => void;
  heading: string | null;
  empty: string;
  data: T[];
  keyOf: (item: T) => number;
  renderRow: (item: T) => ReactNode;
}) {
  const t = useTheme();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: t.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
        <Field
          label="Search"
          value={query}
          onChangeText={onQuery}
          placeholder={placeholder}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      {fallback ? (
        <View style={{ padding: spacing.lg }}>{fallback}</View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(keyOf(item))}
          renderItem={({ item }) => <>{renderRow(item)}</>}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs }}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, paddingBottom: spacing.sm }}>
              {onCreate ? <CreateRow label={createLabel} onPress={onCreate} /> : null}
              {heading && data.length ? <Label muted>{heading}</Label> : null}
            </View>
          }
          ListEmptyComponent={<Body muted>{empty}</Body>}
        />
      )}
    </SafeAreaView>
  );
}

function PickerRow({
  title,
  detail,
  disabled,
  onPress,
}: {
  title: string;
  detail: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${title}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: pressed ? t.button.secondary.bg : t.card.bg,
        borderColor: t.card.border,
        borderWidth: 1,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Body>{title}</Body>
        <Body muted style={{ fontSize: 13 }}>
          {detail}
        </Body>
      </View>
      <Text style={{ color: t.primary, fontSize: 22, fontWeight: '600' }}>+</Text>
    </Pressable>
  );
}

function CreateRow({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: t.primary,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: t.primary, fontWeight: '600' }}>+ {label}</Text>
    </Pressable>
  );
}
