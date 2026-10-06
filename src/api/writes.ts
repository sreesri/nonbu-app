import type { MutationMeta, QueryClient } from '@tanstack/react-query';

import { toDateKey } from '@/lib/format';
import { DEFAULT_FAST_HOURS, HOURS_PER_DAY } from '@/lib/goals';
import { ApiError, api } from './client';
import { keys } from './keys';
import type { DailySummary, FoodEntry, FoodInput, Session, SessionKind, SessionSwitch, Totals, User, UserPatch } from './types';

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
  saveFood: ['write', 'saveFood'],
  deleteFood: ['write', 'deleteFood'],
  updateMe: ['write', 'updateMe'],
} as const;

/** Every queued write shares this scope, which makes React Query run them serially. */
const QUEUE_SCOPE = { id: 'nonbu-writes' };
const QUEUED_META = { queued: true };
const MAX_RETRY_DELAY_MS = 30_000;

export type SwitchVars = SessionSwitch & { at: string };
export type SessionPatchVars = Partial<Omit<Session, 'kind'>> & { id: number };
export type SaveFoodVars = Partial<FoodInput> & { id?: number };

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

  qc.setMutationDefaults(writeKeys.saveFood, {
    ...queued,
    mutationFn: ({ id, ...body }: SaveFoodVars) =>
      id === undefined
        ? api<FoodEntry>('/food', { method: 'POST', body })
        : api<FoodEntry>(`/food/${id}`, { method: 'PATCH', body }),
    onMutate: async ({ id, ...body }: SaveFoodVars) => {
      await qc.cancelQueries({ queryKey: ['food'] });
      await qc.cancelQueries({ queryKey: ['summary'] });
      const previous = id === undefined ? undefined : findCachedFood(qc, id);
      if (previous) removeFood(qc, previous);
      const entry: FoodEntry = { ...EMPTY_FOOD, ...previous, ...body, id: id ?? tempId() };
      addFood(qc, entry);
      qc.setQueryData(keys.foodEntry(entry.id), entry);
    },
  });

  qc.setMutationDefaults(writeKeys.deleteFood, {
    ...queued,
    mutationFn: (id: number) => api<void>(`/food/${id}`, { method: 'DELETE' }),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['food'] });
      await qc.cancelQueries({ queryKey: ['summary'] });
      const entry = findCachedFood(qc, id);
      if (entry) removeFood(qc, entry);
      qc.removeQueries({ queryKey: keys.foodEntry(id), exact: true });
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

// --- food cache helpers ---------------------------------------------------

const EMPTY_FOOD: Omit<FoodEntry, 'id'> = {
  eaten_at: new Date(0).toISOString(),
  name: '',
  meal_type: 'snack',
  quantity: null,
  unit: null,
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  fiber_g: null,
  notes: null,
};

const TOTAL_FIELDS: (keyof Totals)[] = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'];

/** Local calendar day the entry is logged under (the device and account share a timezone). */
const dayOf = (entry: FoodEntry) => toDateKey(new Date(entry.eaten_at));

function findCachedFood(qc: QueryClient, id: number): FoodEntry | undefined {
  const direct = qc.getQueryData<FoodEntry>(keys.foodEntry(id));
  if (direct) return direct;
  for (const [, list] of qc.getQueriesData<FoodEntry[]>({ queryKey: keys.foodDays })) {
    const entry = list?.find((e) => e.id === id);
    if (entry) return entry;
  }
  return undefined;
}

/** Adds the entry to its day's list (kept in eaten_at order, like the API) and day totals. */
function addFood(qc: QueryClient, entry: FoodEntry) {
  qc.setQueryData<FoodEntry[]>(keys.food(dayOf(entry)), (list) =>
    list && [...list, entry].sort((a, b) => a.eaten_at.localeCompare(b.eaten_at)),
  );
  adjustDailyTotals(qc, entry, 1);
}

function removeFood(qc: QueryClient, entry: FoodEntry) {
  qc.setQueryData<FoodEntry[]>(keys.food(dayOf(entry)), (list) => list?.filter((e) => e.id !== entry.id));
  adjustDailyTotals(qc, entry, -1);
}

function adjustDailyTotals(qc: QueryClient, entry: FoodEntry, sign: 1 | -1) {
  qc.setQueryData<DailySummary>(keys.daily(dayOf(entry)), (summary) => {
    if (!summary) return summary;
    const totals = { ...summary.totals };
    for (const field of TOTAL_FIELDS) totals[field] += sign * (entry[field] ?? 0);
    return { ...summary, totals, entry_count: summary.entry_count + sign };
  });
}
