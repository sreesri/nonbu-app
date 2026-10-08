import { useEffect } from 'react';

import { useCurrentSession, useDailySummary } from '@/api/hooks';
import { todayKey } from '@/lib/format';
import { snapshotFrom } from './snapshot';
import { pushWidget } from './sync';

/**
 * Keeps the home-screen widget in step with the app: every fast/meal mutation invalidates these
 * queries, so their refetched data is pushed to the widget immediately. Render while signed in.
 */
export function WidgetSync() {
  const session = useCurrentSession();
  const summary = useDailySummary(todayKey());

  useEffect(() => {
    if (session.data === undefined || summary.data === undefined) return;
    // Best-effort: the widget refetches on its own when its cache goes stale.
    pushWidget(snapshotFrom(session.data, summary.data)).catch(() => {});
  }, [session.data, summary.data]);

  return null;
}
