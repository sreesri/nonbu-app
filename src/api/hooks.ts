import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import { keys } from './keys';
import type {
  DailySummary,
  Dish,
  Meal,
  OnboardingInput,
  SavedMeal,
  Session,
  SessionKind,
  SessionSwitch,
  Streak,
  User,
  UserPatch,
} from './types';
import {
  writeKeys,
  type SaveDishVars,
  type SaveMealVars,
  type SaveSavedMealVars,
  type SessionPatchVars,
  type SwitchVars,
} from './writes';

// Write hooks below only name a queued write; its request and optimistic update live in
// ./writes.ts. Writes apply to the cache immediately, so screens shouldn't wait on them.

// --- user ---------------------------------------------------------------

export function useMe(enabled = true) {
  return useQuery({ queryKey: keys.me, queryFn: () => api<User>('/me'), enabled });
}

export function useUpdateMe() {
  return useMutation<User, Error, UserPatch>({ mutationKey: writeKeys.updateMe });
}

/** Not queued: onboarding needs the server's answer before the app can continue. */
export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: OnboardingInput) => api<User>('/me/onboarding', { method: 'POST', body }),
    onSuccess: (user) => {
      qc.setQueryData(keys.me, user);
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

// --- sessions -----------------------------------------------------------

export function useCurrentSession() {
  return useQuery({ queryKey: keys.currentSession, queryFn: () => api<Session | null>('/sessions/current') });
}

export function useSessions(from: string, to: string, kind?: SessionKind) {
  return useQuery({
    queryKey: keys.sessions(from, to, kind),
    queryFn: () => api<Session[]>('/sessions', { query: { from, to, kind } }),
  });
}

/** Close the current session and open one of the other kind (start or end a fast). */
export function useSwitchSession() {
  const mutation = useMutation<Session, Error, SwitchVars>({ mutationKey: writeKeys.switchSession });
  return {
    ...mutation,
    // Pin the switch time now: a queued write may only reach the server much later.
    mutate: (body: SessionSwitch) => mutation.mutate({ ...body, at: body.at ?? new Date().toISOString() }),
  };
}

export function useUpdateSession() {
  return useMutation<Session, Error, SessionPatchVars>({ mutationKey: writeKeys.updateSession });
}

export function useDeleteSession() {
  return useMutation<void, Error, number>({ mutationKey: writeKeys.deleteSession });
}

// --- meals --------------------------------------------------------------

export function useMealsDay(date: string) {
  return useQuery({
    queryKey: keys.meals(date),
    queryFn: () => api<Meal[]>('/meals', { query: { date } }),
  });
}

export function useMeal(id: number) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: keys.meal(id),
    queryFn: () => api<Meal>(`/meals/${id}`),
    // Open instantly (and offline) from the day list the meal was tapped in.
    placeholderData: () =>
      qc
        .getQueriesData<Meal[]>({ queryKey: keys.mealDays })
        .flatMap(([, list]) => list ?? [])
        .find((m) => m.id === id),
  });
}

export function useSaveMeal() {
  return useMutation<Meal, Error, SaveMealVars>({ mutationKey: writeKeys.saveMeal });
}

export function useDeleteMeal() {
  return useMutation<void, Error, number>({ mutationKey: writeKeys.deleteMeal });
}

// --- library ------------------------------------------------------------

export function useDishes() {
  return useQuery({ queryKey: keys.dishes, queryFn: () => api<Dish[]>('/library/dishes') });
}

export function useSaveDish() {
  return useMutation<Dish, Error, SaveDishVars>({ mutationKey: writeKeys.saveDish });
}

export function useDeleteDish() {
  return useMutation<void, Error, number>({ mutationKey: writeKeys.deleteDish });
}

export function useSavedMeals() {
  return useQuery({ queryKey: keys.savedMeals, queryFn: () => api<SavedMeal[]>('/library/meals') });
}

export function useSaveSavedMeal() {
  return useMutation<SavedMeal, Error, SaveSavedMealVars>({ mutationKey: writeKeys.saveSavedMeal });
}

export function useDeleteSavedMeal() {
  return useMutation<void, Error, number>({ mutationKey: writeKeys.deleteSavedMeal });
}

// --- summary ------------------------------------------------------------

export function useDailySummary(date: string) {
  return useQuery({
    queryKey: keys.daily(date),
    queryFn: () => api<DailySummary>('/summary/daily', { query: { date } }),
  });
}

export function useStreak() {
  return useQuery({ queryKey: keys.streak, queryFn: () => api<Streak>('/summary/streak') });
}

export function useRangeSummary(from: string, to: string) {
  return useQuery({
    queryKey: keys.range(from, to),
    queryFn: () => api<DailySummary[]>('/summary/range', { query: { from, to } }),
  });
}
