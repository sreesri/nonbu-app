import type { MutationMeta, QueryClient } from '@tanstack/react-query';

import { toDateKey } from '@/lib/format';
import { DEFAULT_FAST_HOURS, HOURS_PER_DAY } from '@/lib/goals';
import { ApiError, api } from './client';
import { keys } from './keys';
import { mealTotals, NUTRIENTS, sumTotals } from '@/lib/nutrition';
import type {
  DailySummary,
  Dish,
  DishInput,
  Meal,
  MealInput,
  SavedMeal,
  SavedMealInput,
  Session,
  SessionKind,
  SessionSwitch,
  User,
  UserPatch,
} from './types';

/**
 * Offline-first writes. Each one updates the cache optimistically, then runs against the API in
 * a single queue (one at a time, in order) that pauses while offline, retries transient failures
 * and is persisted with the cache, so it survives restarts. The handlers are registered as
 * mutation defaults rather than passed to useMutation, because writes restored from disk have no
 * component attached and only get their behaviour from these defaults.
 */

export const writeKeys = {
  switchSession: ['write', 'switchSession'],
  updateSession: ['write', 'updateSession'],
  deleteSession: ['write', 'deleteSession'],
  saveMeal: ['write', 'saveMeal'],
  deleteMeal: ['write', 'deleteMeal'],
  saveDish: ['write', 'saveDish'],
  deleteDish: ['write', 'deleteDish'],
  saveSavedMeal: ['write', 'saveSavedMeal'],
  deleteSavedMeal: ['write', 'deleteSavedMeal'],
  updateMe: ['write', 'updateMe'],
} as const;

/** Every queued write shares this scope, which makes React Query run them serially. */
const QUEUE_SCOPE = { id: 'nonbu-writes' };
const QUEUED_META = { queued: true };
const MAX_RETRY_DELAY_MS = 30_000;

export type SwitchVars = SessionSwitch & { at: string };
export type SessionPatchVars = Partial<Omit<Session, 'kind'>> & { id: number };
export type SaveMealVars = Partial<MealInput> & { id?: number };
export type SaveDishVars = Partial<DishInput> & { id?: number };
export type SaveSavedMealVars = Partial<SavedMealInput> & { id?: number };

export function isQueuedWrite(mutation: { meta?: MutationMeta }): boolean {
  return mutation.meta?.queued === true;
}

/** Ids for optimistic records the server hasn't assigned an id to yet; never valid server ids. */
function tempId(): number {
  return -Date.now();
}

/** True for a record created offline and not yet synced; it can't be edited until it is. */
export function isUnsynced(record: { id: number }): boolean {
  return record.id < 0;
}

export function registerQueuedWrites(qc: QueryClient): void {
  const queued = {
    scope: QUEUE_SCOPE,
    meta: QUEUED_META,
    retry: (_count: number, error: Error) => isTransient(error),
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS),
    onSettled: () => refreshWhenQueueDrains(qc),
  };

  qc.setMutationDefaults(writeKeys.switchSession, {
    ...queued,
    mutationFn: (body: SwitchVars) => api<Session>('/sessions/switch', { method: 'POST', body }),
    onMutate: async (vars: SwitchVars) => {
      await qc.cancelQueries({ queryKey: keys.currentSession });
      const session: Session = {
        id: tempId(),
        kind: vars.kind,
        started_at: vars.at,
        ended_at: null,
        target_hours: vars.target_hours ?? defaultTargetHours(qc.getQueryData<User>(keys.me), vars.kind),
        notes: null,
      };
      qc.setQueryData(keys.currentSession, session);
    },
  });

  qc.setMutationDefaults(writeKeys.updateSession, {
    ...queued,
    mutationFn: ({ id, ...patch }: SessionPatchVars) => api<Session>(`/sessions/${id}`, { method: 'PATCH', body: patch }),
    onMutate: async ({ id, ...patch }: SessionPatchVars) => {
      await qc.cancelQueries({ queryKey: ['sessions'] });
      const apply = (s: Session) => (s.id === id ? { ...s, ...patch } : s);
      qc.setQueryData<Session | null>(keys.currentSession, (s) => s && apply(s));
      qc.setQueriesData<Session[]>({ queryKey: keys.sessionLists }, (list) => list?.map(apply));
    },
  });

  qc.setMutationDefaults(writeKeys.deleteSession, {
    ...queued,
    mutationFn: (id: number) => api<void>(`/sessions/${id}`, { method: 'DELETE' }),
    // The current session isn't touched: deleting it resumes the previous one server-side.
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: keys.sessionLists });
      qc.setQueriesData<Session[]>({ queryKey: keys.sessionLists }, (list) => list?.filter((s) => s.id !== id));
    },
  });

  qc.setMutationDefaults(writeKeys.saveMeal, {
    ...queued,
    mutationFn: ({ id, ...body }: SaveMealVars) =>
      id === undefined
        ? api<Meal>('/meals', { method: 'POST', body })
        : api<Meal>(`/meals/${id}`, { method: 'PATCH', body }),
    onMutate: async ({ id, ...body }: SaveMealVars) => {
      await qc.cancelQueries({ queryKey: ['meals'] });
      await qc.cancelQueries({ queryKey: ['summary'] });
      const previous = id === undefined ? undefined : findCachedMeal(qc, id);
      if (previous) removeMeal(qc, previous);
      const merged = { ...EMPTY_MEAL, ...previous, ...body };
      const meal: Meal = { ...merged, id: id ?? tempId(), totals: mealTotals(merged.items) };
      addMeal(qc, meal);
      qc.setQueryData(keys.meal(meal.id), meal);
    },
  });

  qc.setMutationDefaults(writeKeys.deleteMeal, {
    ...queued,
    mutationFn: (id: number) => api<void>(`/meals/${id}`, { method: 'DELETE' }),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['meals'] });
      await qc.cancelQueries({ queryKey: ['summary'] });
      const meal = findCachedMeal(qc, id);
      if (meal) removeMeal(qc, meal);
      qc.removeQueries({ queryKey: keys.meal(id), exact: true });
    },
  });

  qc.setMutationDefaults(writeKeys.saveDish, {
    ...queued,
    mutationFn: ({ id, ...body }: SaveDishVars) =>
      id === undefined
        ? api<Dish>('/library/dishes', { method: 'POST', body })
        : api<Dish>(`/library/dishes/${id}`, { method: 'PATCH', body }),
    onMutate: async ({ id, ...body }: SaveDishVars) => {
      await qc.cancelQueries({ queryKey: ['library'] });
      const previous = qc.getQueryData<Dish[]>(keys.dishes)?.find((d) => d.id === id);
      const dish: Dish = { ...EMPTY_DISH, ...previous, ...body, id: id ?? tempId() };
      qc.setQueryData<Dish[]>(keys.dishes, (list) => byName([...(list ?? []).filter((d) => d.id !== dish.id), dish]));
      // Saved meals show their dishes' current values.
      qc.setQueryData<SavedMeal[]>(keys.savedMeals, (meals) =>
        meals?.map((m) => withTotals({ ...m, items: m.items.map((i) => (i.dish.id === dish.id ? { ...i, dish } : i)) })),
      );
    },
  });

  qc.setMutationDefaults(writeKeys.deleteDish, {
    ...queued,
    mutationFn: (id: number) => api<void>(`/library/dishes/${id}`, { method: 'DELETE' }),
    // Mirrors the server: the dish leaves every saved meal, and a meal left empty is deleted.
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['library'] });
      qc.setQueryData<Dish[]>(keys.dishes, (list) => list?.filter((d) => d.id !== id));
      qc.setQueryData<SavedMeal[]>(keys.savedMeals, (meals) =>
        meals
          ?.map((m) => withTotals({ ...m, items: m.items.filter((i) => i.dish.id !== id) }))
          .filter((m) => m.items.length > 0),
      );
    },
  });

  qc.setMutationDefaults(writeKeys.saveSavedMeal, {
    ...queued,
    mutationFn: ({ id, ...body }: SaveSavedMealVars) =>
      id === undefined
        ? api<SavedMeal>('/library/meals', { method: 'POST', body })
        : api<SavedMeal>(`/library/meals/${id}`, { method: 'PATCH', body }),
    onMutate: async ({ id, name, items }: SaveSavedMealVars) => {
      await qc.cancelQueries({ queryKey: ['library'] });
      const previous = qc.getQueryData<SavedMeal[]>(keys.savedMeals)?.find((m) => m.id === id);
      const dishes = new Map((qc.getQueryData<Dish[]>(keys.dishes) ?? []).map((d) => [d.id, d]));
      const resolved = items?.flatMap(({ dish_id, servings }) => {
        const dish = dishes.get(dish_id);
        return dish ? [{ dish, servings }] : [];
      });
      const meal = withTotals({
        id: id ?? tempId(),
        name: name ?? previous?.name ?? '',
        items: resolved ?? previous?.items ?? [],
        totals: EMPTY_TOTALS,
      });
      qc.setQueryData<SavedMeal[]>(keys.savedMeals, (list) => byName([...(list ?? []).filter((m) => m.id !== meal.id), meal]));
    },
  });

  qc.setMutationDefaults(writeKeys.deleteSavedMeal, {
    ...queued,
    mutationFn: (id: number) => api<void>(`/library/meals/${id}`, { method: 'DELETE' }),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['library'] });
      qc.setQueryData<SavedMeal[]>(keys.savedMeals, (list) => list?.filter((m) => m.id !== id));
    },
  });

  qc.setMutationDefaults(writeKeys.updateMe, {
    ...queued,
    mutationFn: (patch: UserPatch) => api<User>('/me', { method: 'PATCH', body: patch }),
    onMutate: async (patch: UserPatch) => {
      await qc.cancelQueries({ queryKey: keys.me });
      qc.setQueryData<User>(keys.me, (user) => user && applyUserPatch(user, patch));
    },
  });
}

/**
 * Optimistic data stands in for the server's until the whole queue has synced; refreshing after
 * each write would flash intermediate server states while later writes are still queued.
 */
function refreshWhenQueueDrains(qc: QueryClient): Promise<void> | undefined {
  // The settling write still counts as mutating while its onSettled runs.
  if (qc.isMutating({ predicate: isQueuedWrite }) > 1) return;
  return qc.invalidateQueries();
}

/** Network failures and server outages are retried; a 4xx means the write itself is rejected. */
function isTransient(error: Error): boolean {
  return !(error instanceof ApiError) || error.status >= 500;
}

function defaultTargetHours(user: User | undefined, kind: SessionKind): number {
  const fastHours = user?.goals.default_fast_hours ?? DEFAULT_FAST_HOURS;
  return kind === 'fast' ? fastHours : HOURS_PER_DAY - fastHours;
}

function applyUserPatch(user: User, { goals, ...rest }: UserPatch): User {
  if (!goals) return { ...user, ...rest };
  const merged = { ...user.goals, ...goals };
  return {
    ...user,
    ...rest,
    goals: { ...merged, eating_window_hours: HOURS_PER_DAY - merged.default_fast_hours },
  };
}

// --- meal cache helpers ---------------------------------------------------

const EMPTY_MEAL: MealInput = {
  eaten_at: new Date(0).toISOString(),
  name: null,
  meal_type: 'snack',
  notes: null,
  items: [],
};

const EMPTY_DISH: DishInput = {
  name: '',
  quantity: null,
  unit: null,
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  fiber_g: null,
};

const EMPTY_TOTALS = sumTotals([]);

/** Alphabetical, ignoring case, like the library endpoints. */
function byName<T extends { name: string }>(list: T[]): T[] {
  return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function withTotals(meal: SavedMeal): SavedMeal {
  return { ...meal, totals: sumTotals(meal.items.map((i) => ({ nutrition: i.dish, servings: i.servings }))) };
}

/** Local calendar day the meal is logged under (the device and account share a timezone). */
const dayOf = (meal: Meal) => toDateKey(new Date(meal.eaten_at));

function findCachedMeal(qc: QueryClient, id: number): Meal | undefined {
  const direct = qc.getQueryData<Meal>(keys.meal(id));
  if (direct) return direct;
  for (const [, list] of qc.getQueriesData<Meal[]>({ queryKey: keys.mealDays })) {
    const meal = list?.find((m) => m.id === id);
    if (meal) return meal;
  }
  return undefined;
}

/** Adds the meal to its day's list (kept in eaten_at order, like the API) and day totals. */
function addMeal(qc: QueryClient, meal: Meal) {
  qc.setQueryData<Meal[]>(keys.meals(dayOf(meal)), (list) =>
    list && [...list, meal].sort((a, b) => a.eaten_at.localeCompare(b.eaten_at)),
  );
  adjustDailyTotals(qc, meal, 1);
}

function removeMeal(qc: QueryClient, meal: Meal) {
  qc.setQueryData<Meal[]>(keys.meals(dayOf(meal)), (list) => list?.filter((m) => m.id !== meal.id));
  adjustDailyTotals(qc, meal, -1);
}

function adjustDailyTotals(qc: QueryClient, meal: Meal, sign: 1 | -1) {
  qc.setQueryData<DailySummary>(keys.daily(dayOf(meal)), (summary) => {
    if (!summary) return summary;
    const totals = { ...summary.totals };
    for (const n of NUTRIENTS) totals[n] += sign * meal.totals[n];
    return { ...summary, totals, entry_count: summary.entry_count + sign };
  });
}
