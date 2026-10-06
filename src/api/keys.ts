import type { SessionKind } from './types';

/** React Query cache keys, shared by the read hooks and the optimistic write handlers. */
export const keys = {
  me: ['me'] as const,
  currentSession: ['sessions', 'current'] as const,
  sessionLists: ['sessions', 'list'] as const,
  sessions: (from: string, to: string, kind?: SessionKind) => ['sessions', 'list', from, to, kind] as const,
  foodDays: ['food', 'day'] as const,
  food: (date: string) => ['food', 'day', date] as const,
  foodEntry: (id: number) => ['food', 'entry', id] as const,
  recentFood: ['food', 'recent'] as const,
  daily: (date: string) => ['summary', 'daily', date] as const,
  range: (from: string, to: string) => ['summary', 'range', from, to] as const,
};
