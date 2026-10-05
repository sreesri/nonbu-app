import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { renderNonbuWidget, WIDGET_NAME } from './NonbuWidget';
import { clearSnapshot, saveSnapshot, type WidgetSnapshot } from './snapshot';

/**
 * Cache `snapshot` for the widget's own ticks and redraw it now, or show the signed-out state
 * when `snapshot` is null.
 */
export async function pushWidget(snapshot: WidgetSnapshot | null): Promise<void> {
  if (Platform.OS !== 'android') return;
  await (snapshot ? saveSnapshot(snapshot) : clearSnapshot());
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: () => renderNonbuWidget(snapshot, snapshot !== null),
  });
}
