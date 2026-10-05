import * as SecureStore from 'expo-secure-store';

import { api } from '@/api/client';
import type { DailySummary, Session } from '@/api/types';
import { todayKey } from '@/lib/format';

const SNAPSHOT_KEY = 'nonbu.widgetSnapshot';

/** How long the widget trusts its cached data before fetching on its own. */
const MAX_AGE_MS = 30 * 60_000;

/**
 * What the home-screen widget shows. Cached so its once-a-minute re-render needs no network:
 * elapsed time is derived from `session.started_at` at render time.
 */
export type WidgetSnapshot = {
  session: Pick<Session, 'kind' | 'started_at' | 'target_hours'> | null;
  /** Local date (YYYY-MM-DD) the calorie figures belong to. */
  date: string;
  calories: number;
  calorieGoal: number | null;
  savedAt: number;
};

export function snapshotFrom(session: Session | null, summary: DailySummary): WidgetSnapshot {
  return {
    session: session && { kind: session.kind, started_at: session.started_at, target_hours: session.target_hours },
    date: summary.date,
    calories: summary.totals.calories,
    calorieGoal: summary.goals.daily_calories,
    savedAt: Date.now(),
  };
}

/** Stale once it's older than {@link MAX_AGE_MS} or its calories belong to an earlier day. */
export function isStale(snapshot: WidgetSnapshot, now: number): boolean {
  return snapshot.date !== todayKey() || now - snapshot.savedAt > MAX_AGE_MS;
}

export async function fetchSnapshot(): Promise<WidgetSnapshot> {
  const [session, summary] = await Promise.all([
    api<Session | null>('/sessions/current'),
    api<DailySummary>('/summary/daily', { query: { date: todayKey() } }),
  ]);
  return snapshotFrom(session, summary);
}

export async function loadSnapshot(): Promise<WidgetSnapshot | null> {
  const raw = await SecureStore.getItemAsync(SNAPSHOT_KEY);
  return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
}

export async function saveSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  await SecureStore.setItemAsync(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export async function clearSnapshot(): Promise<void> {
  await SecureStore.deleteItemAsync(SNAPSHOT_KEY);
}
