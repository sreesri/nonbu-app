import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';
import type {
  DailySummary,
  FoodEntry,
  FoodInput,
  OnboardingInput,
  Session,
  SessionKind,
  SessionSwitch,
  User,
  UserPatch,
} from './types';

export const keys = {
  me: ['me'] as const,
  currentSession: ['sessions', 'current'] as const,
  sessions: (from: string, to: string, kind?: SessionKind) => ['sessions', 'list', from, to, kind] as const,
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

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
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

function useInvalidateSessions() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['sessions'] });
    qc.invalidateQueries({ queryKey: ['summary'] });
  };
}

/** Close the current session and open one of the other kind (start or end a fast). */
export function useSwitchSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (body: SessionSwitch) => api<Session>('/sessions/switch', { method: 'POST', body }),
    onSettled: invalidate,
  });
}

export function useUpdateSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<Omit<Session, 'kind'>> & { id: number }) =>
      api<Session>(`/sessions/${id}`, { method: 'PATCH', body: patch }),
    onSettled: invalidate,
  });
}

export function useDeleteSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/sessions/${id}`, { method: 'DELETE' }),
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
