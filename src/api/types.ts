export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type Goals = {
  daily_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  default_fast_hours: number;
  /** Derived by the backend: 24 - default_fast_hours. Read-only. */
  eating_window_hours: number;
};

export type GoalsInput = Partial<Omit<Goals, 'eating_window_hours'>>;

export type User = {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  timezone: string;
  /** Null until the first-run setup has been completed. */
  onboarded_at: string | null;
  goals: Goals;
};

export type UserPatch = {
  name?: string;
  timezone?: string;
  goals?: GoalsInput;
};

export type SessionKind = 'fast' | 'eat';

/** A fasting or eating session; sessions alternate on a contiguous timeline. */
export type Session = {
  id: number;
  kind: SessionKind;
  started_at: string;
  ended_at: string | null;
  target_hours: number;
  notes: string | null;
};

export type SessionSwitch = {
  kind: SessionKind;
  at?: string;
  target_hours?: number;
};

/** The session the user is in at setup: when it started, or (eating only) when they plan to
 * start fasting — the eating window is then counted from the start of today. */
export type OnboardingSession =
  | { kind: SessionKind; started_at: string }
  | { kind: 'eat'; fast_at: string };

export type OnboardingInput = {
  timezone: string;
  goals: GoalsInput;
  current: OnboardingSession;
};

export type Totals = { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number };

/** Nutrition for one serving; any value may be unknown. */
export type Nutrition = { [K in keyof Totals]: number | null };

/** A dish in the user's library; `quantity` + `unit` describe one serving (e.g. 2 pc). */
export type Dish = Nutrition & {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
};

export type DishInput = Omit<Dish, 'id'>;

/** A named combination of library dishes; its totals follow the dishes' current values. */
export type SavedMeal = {
  id: number;
  name: string;
  items: { dish: Dish; servings: number }[];
  totals: Totals;
};

export type SavedMealInput = {
  name: string;
  items: { dish_id: number; servings: number }[];
};

/** A dish as eaten in a logged meal: copied from the library, so later library edits don't change it. */
export type MealItem = Nutrition & {
  name: string;
  quantity: number | null;
  unit: string | null;
  servings: number;
};

export type Meal = {
  id: number;
  eaten_at: string;
  name: string | null;
  meal_type: MealType;
  notes: string | null;
  items: MealItem[];
  /** Sum of the items' nutrition times their servings. Read-only. */
  totals: Totals;
};

export type MealInput = Omit<Meal, 'id' | 'totals'>;

export type DailySummary = {
  date: string;
  totals: Totals;
  goals: Goals;
  /** Meals logged that day. */
  entry_count: number;
  fasting_hours: number;
};
