import type { Dish, LibraryDish, MealItem, MealType, Nutrition, Totals } from '@/api/types';
import { round } from './format';

export const NUTRIENTS: (keyof Totals)[] = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'];

export const EMPTY_NUTRITION: Nutrition = { calories: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null };

/** Matches the backend, which rounds totals so float noise never shows. */
const TOTALS_DECIMALS = 2;

/** Total nutrition of per-serving values times servings; unknown values count as 0. */
export function sumTotals(parts: { nutrition: Nutrition; servings: number }[]): Totals {
  const totals: Totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
  for (const { nutrition, servings } of parts) {
    for (const n of NUTRIENTS) totals[n] += (nutrition[n] ?? 0) * servings;
  }
  for (const n of NUTRIENTS) totals[n] = Number(totals[n].toFixed(TOTALS_DECIMALS));
  return totals;
}

export function mealTotals(items: MealItem[]): Totals {
  return sumTotals(items.map((item) => ({ nutrition: item, servings: item.servings })));
}

/** Calories per gram, for showing how much of a meal's energy each macro supplies. */
export const KCAL_PER_GRAM = { protein_g: 4, carbs_g: 4, fat_g: 9 } as const;

/** Adds each item, or more servings of it when its dish is already in the meal. */
export function mergeItems(items: MealItem[], added: MealItem[]): MealItem[] {
  const merged = [...items];
  for (const item of added) {
    const i = item.dish_id === null ? -1 : merged.findIndex((m) => m.dish_id === item.dish_id);
    if (i === -1) merged.push(item);
    else merged[i] = { ...merged[i], servings: merged[i].servings + item.servings };
  }
  return merged;
}

/** A logged-meal item copied from a library dish. */
export function itemFromDish(dish: Dish, servings = 1): MealItem {
  const { id, name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g } = dish;
  return { dish_id: id, name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g, servings };
}

const timesEaten = (d: LibraryDish) => d.times_eaten ?? 0;

/** Dishes most recently eaten first, then the most eaten; never-eaten ones keep their order. */
export function recentDishes<D extends LibraryDish>(dishes: D[]): D[] {
  const last = (d: D) => (d.last_eaten_at ? Date.parse(d.last_eaten_at) : 0);
  return [...dishes].sort((a, b) => last(b) - last(a) || timesEaten(b) - timesEaten(a));
}

/** Dishes matching `query`: names starting with it first, then a word starting with it, then
 * anywhere in the name; ties go to the most eaten. */
export function searchDishes<D extends LibraryDish>(dishes: D[], query: string): D[] {
  const q = query.trim().toLowerCase();
  const rank = (d: D) => {
    const name = d.name.toLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.split(/\s+/).some((word) => word.startsWith(q))) return 1;
    return name.includes(q) ? 2 : null;
  };
  return dishes
    .flatMap((d) => {
      const r = rank(d);
      return r === null ? [] : [{ d, r }];
    })
    .sort((a, b) => a.r - b.r || timesEaten(b.d) - timesEaten(a.d))
    .map(({ d }) => d);
}

/** The usual meal for a time of day, as a default the user can change. */
export function guessMealType(date: Date): MealType {
  const h = date.getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h >= 18 && h < 23) return 'dinner';
  return 'snack';
}

/** "2 pc", "250 g", or "" when the serving size isn't set. */
export function formatServing(quantity: number | null, unit: string | null): string {
  if (quantity == null) return unit ?? '';
  return unit ? `${quantity} ${unit}` : String(quantity);
}

/** "P 10 · C 50 · F 6 · Fb 8" */
export function formatMacros(n: Nutrition | Totals): string {
  return `P ${round(n.protein_g)} · C ${round(n.carbs_g)} · F ${round(n.fat_g)} · Fb ${round(n.fiber_g)}`;
}
