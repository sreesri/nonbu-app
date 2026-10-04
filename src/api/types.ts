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

export type FoodEntry = {
  id: number;
  eaten_at: string;
  name: string;
  meal_type: MealType;
  quantity: number | null;
  unit: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
};

export type FoodInput = Omit<FoodEntry, 'id'>;

export type Totals = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

export type DailySummary = {
  date: string;
  totals: Totals;
  goals: Goals;
  entry_count: number;
  fasting_hours: number;
};
