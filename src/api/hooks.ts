import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import type { DailySummary, Fast, FoodEntry, FoodInput, User, UserPatch } from './types';

export const keys = {
  me: ['me'] as const,
  currentFast: ['fasts', 'current'] as const,
  fasts: (from: string, to: string) => ['fasts', 'list', from, to] as const,
  food: (date: string) => ['food', 'day', date] as const,
  foodEntry: (id: number) => ['food', 'entry', id] as const,
  recentFood: ['food', 'recent'] as const,
  daily: (date: string) => ['summary', 'daily', date] as const,
  range: (from: string, to: string) => ['summary', 'range', from, to] as const,
};

// --- user ---------------------------------------------------------------

export function useMe(enabled = true) {
  return useQuery({ queryKey: keys.me, queryFn: () => api<User>('/me'), enabled });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UserPatch) => api<User>('/me', { method: 'PATCH', body: patch }),
    onSuccess: (user) => {
      qc.setQueryData(keys.me, user);
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

// --- fasts --------------------------------------------------------------

export function useCurrentFast() {
  return useQuery({ queryKey: keys.currentFast, queryFn: () => api<Fast | null>('/fasts/current') });
}

export function useFasts(from: string, to: string) {
  return useQuery({
    queryKey: keys.fasts(from, to),
    queryFn: () => api<Fast[]>('/fasts', { query: { from, to } }),
  });
}

function useInvalidateFasts() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['fasts'] });
    qc.invalidateQueries({ queryKey: ['summary'] });
  };
}

export function useStartFast() {
  const invalidate = useInvalidateFasts();
  return useMutation({
    mutationFn: (body: { started_at?: string; target_hours?: number }) =>
      api<Fast>('/fasts/start', { method: 'POST', body }),
    onSettled: invalidate,
  });
}

export function useEndFast() {
  const invalidate = useInvalidateFasts();
  return useMutation({
    mutationFn: ({ id, ended_at }: { id: number; ended_at?: string }) =>
      api<Fast>(`/fasts/${id}/end`, { method: 'POST', body: { ended_at } }),
    onSettled: invalidate,
  });
}

export function useUpdateFast() {
  const invalidate = useInvalidateFasts();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<Fast> & { id: number }) =>
      api<Fast>(`/fasts/${id}`, { method: 'PATCH', body: patch }),
    onSettled: invalidate,
  });
}

export function useDeleteFast() {
  const invalidate = useInvalidateFasts();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/fasts/${id}`, { method: 'DELETE' }),
    onSettled: invalidate,
  });
}

// --- food ---------------------------------------------------------------

export function useFoodDay(date: string) {
  return useQuery({
    queryKey: keys.food(date),
    queryFn: () => api<FoodEntry[]>('/food', { query: { date } }),
  });
}

export function useFoodEntry(id: number) {
  return useQuery({ queryKey: keys.foodEntry(id), queryFn: () => api<FoodEntry>(`/food/${id}`) });
}

export function useRecentFood() {
  return useQuery({ queryKey: keys.recentFood, queryFn: () => api<FoodEntry[]>('/food/recent') });
}

function useInvalidateFood() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['food'] });
    qc.invalidateQueries({ queryKey: ['summary'] });
  };
}

export function useSaveFood() {
  const invalidate = useInvalidateFood();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<FoodInput> & { id?: number }) =>
      id === undefined
        ? api<FoodEntry>('/food', { method: 'POST', body })
        : api<FoodEntry>(`/food/${id}`, { method: 'PATCH', body }),
    onSettled: invalidate,
  });
}

export function useDeleteFood() {
  const invalidate = useInvalidateFood();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/food/${id}`, { method: 'DELETE' }),
    onSettled: invalidate,
  });
}

// --- summary ------------------------------------------------------------

export function useDailySummary(date: string) {
  return useQuery({
    queryKey: keys.daily(date),
    queryFn: () => api<DailySummary>('/summary/daily', { query: { date } }),
  });
}

export function useRangeSummary(from: string, to: string) {
  return useQuery({
    queryKey: keys.range(from, to),
    queryFn: () => api<DailySummary[]>('/summary/range', { query: { from, to } }),
  });
}
