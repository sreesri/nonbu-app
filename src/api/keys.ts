import type { SessionKind } from './types';

/** React Query cache keys, shared by the read hooks and the optimistic write handlers. */
export const keys = {
  me: ['me'] as const,
  currentSession: ['sessions', 'current'] as const,
  sessionLists: ['sessions', 'list'] as const,
  sessions: (from: string, to: string, kind?: SessionKind) => ['sessions', 'list', from, to, kind] as const,
  mealDays: ['meals', 'day'] as const,
  meals: (date: string) => ['meals', 'day', date] as const,
  meal: (id: number) => ['meals', 'entry', id] as const,
  dishes: ['library', 'dishes'] as const,
  savedMeals: ['library', 'meals'] as const,
  daily: (date: string) => ['summary', 'daily', date] as const,
  range: (from: string, to: string) => ['summary', 'range', from, to] as const,
};
