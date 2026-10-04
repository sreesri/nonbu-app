import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Session, SessionKind } from '@/api/types';

const CHANNEL_ID = 'fasting';
const KINDS: SessionKind[] = ['fast', 'eat'];
const prefixFor = (kind: SessionKind) => `${kind}-goal-`;
const idFor = (session: Session) => `${prefixFor(session.kind)}${session.id}`;

function contentFor(session: Session): Notifications.NotificationContentInput {
  return session.kind === 'fast'
    ? { title: 'Fasting goal reached 🎉', body: `You've completed your ${session.target_hours}h fast.` }
    : { title: 'Eating window closed', body: "Time to start your fast. Tap Start fast when you're ready." };
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Fasting goals',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Keep exactly one local notification scheduled for the open session: "goal reached" for a
 * fast, "time to fast" when an eating window closes. Local notifications fire even when the
 * app is closed and need no server.
 */
export async function syncSessionNotification(session: Session | null | undefined): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const wanted = session && !session.ended_at ? idFor(session) : null;
  await Promise.all(
    scheduled
      .filter((n) => KINDS.some((k) => n.identifier.startsWith(prefixFor(k))) && n.identifier !== wanted)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!session || !wanted) return;

  const dueAt = new Date(session.started_at).getTime() + session.target_hours * 3600_000;
  if (dueAt <= Date.now()) return;
  if (!(await ensurePermission())) return;

  // Reschedule so edits to start time / target are picked up.
  await Notifications.cancelScheduledNotificationAsync(wanted);
  await Notifications.scheduleNotificationAsync({
    identifier: wanted,
    content: contentFor(session),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dueAt,
      channelId: CHANNEL_ID,
    },
  });
}
