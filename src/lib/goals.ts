import type { Goals, GoalsInput } from '@/api/types';

export const HOURS_PER_DAY = 24;
// Mirrors the backend's bounds: the schedule always leaves at least an hour to fast and to eat.
export const MIN_FAST_HOURS = 1;
export const MAX_FAST_HOURS = HOURS_PER_DAY - 1;
export const DEFAULT_FAST_HOURS = 16;
export const SCHEDULE_PRESETS = [12, 14, 16, 18, 20, 23];

export const clampFastHours = (h: number) => Math.min(Math.max(h, MIN_FAST_HOURS), MAX_FAST_HOURS);

export type NutritionGoal = 'daily_calories' | 'protein_g' | 'carbs_g' | 'fat_g';

/** Nutrition goals as editable text, keyed by goal; '' means not set. */
export type GoalDrafts = Record<NutritionGoal, string>;

export const GOAL_FIELDS: { key: NutritionGoal; label: string }[] = [
  { key: 'daily_calories', label: 'Calories (kcal)' },
  { key: 'protein_g', label: 'Protein (g)' },
  { key: 'carbs_g', label: 'Carbs (g)' },
  { key: 'fat_g', label: 'Fat (g)' },
];

export function goalDrafts(goals?: Goals): GoalDrafts {
  const text = (key: NutritionGoal) => (goals?.[key] == null ? '' : String(goals[key]));
  return { daily_calories: text('daily_calories'), protein_g: text('protein_g'), carbs_g: text('carbs_g'), fat_g: text('fat_g') };
}

/** Drafts → API goals; blank or unparseable fields clear the goal (null). */
export function parseGoalDrafts(drafts: GoalDrafts): GoalsInput {
  const parse = (key: NutritionGoal) => {
    const n = Number(drafts[key].replace(',', '.'));
    return drafts[key].trim() && !Number.isNaN(n) ? n : null;
  };
  return { daily_calories: parse('daily_calories'), protein_g: parse('protein_g'), carbs_g: parse('carbs_g'), fat_g: parse('fat_g') };
}
