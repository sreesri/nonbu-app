import type { Dish, MealItem, MealType, Nutrition, Totals } from '@/api/types';
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

/** A logged-meal item copied from a library dish. */
export function itemFromDish(dish: Dish, servings = 1): MealItem {
  const { id: _id, ...rest } = dish;
  return { ...rest, servings };
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
