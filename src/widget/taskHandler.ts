import type { WidgetTaskHandler } from 'react-native-android-widget';

import { loadTokens } from '@/auth/tokens';
import { renderNonbuWidget } from './NonbuWidget';
import { fetchSnapshot, isStale, loadSnapshot, saveSnapshot, type WidgetSnapshot } from './snapshot';

// Shared across ticks: a cold backend can take longer than a minute, so don't stack fetches.
let refreshing: Promise<WidgetSnapshot | null> | null = null;

function refreshSnapshot(): Promise<WidgetSnapshot | null> {
  refreshing ??= fetchSnapshot()
    .then(async (snapshot) => {
      await saveSnapshot(snapshot);
      return snapshot;
    })
    // Offline or backend asleep: keep showing the cached state and retry on the next tick.
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Runs headless on every widget event, including the once-a-minute tick from
 * plugins/withNonbuWidget.js. Renders from cache right away, then refetches if it's stale.
 */
export const widgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, widgetInfo, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;

  if (!(await loadTokens())) {
    renderWidget(renderNonbuWidget(null, false, widgetInfo));
    return;
  }
  // A corrupt cache entry is treated as missing; the refetch below overwrites it.
  const cached = await loadSnapshot().catch(() => null);
  renderWidget(renderNonbuWidget(cached, true, widgetInfo));
  if (cached && !isStale(cached, Date.now())) return;

  const fresh = await refreshSnapshot();
  if (fresh) renderWidget(renderNonbuWidget(fresh, true, widgetInfo));
};
