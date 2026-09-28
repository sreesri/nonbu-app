import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Fast } from '@/api/types';

const CHANNEL_ID = 'fasting';
const idFor = (fast: Fast) => `fast-goal-${fast.id}`;

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
 * Keep exactly one local "goal reached" notification scheduled for the open fast.
 * Local notifications fire even when the app is closed and need no server.
 */
export async function syncFastNotification(fast: Fast | null | undefined): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const wanted = fast && !fast.ended_at ? idFor(fast) : null;
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('fast-goal-') && n.identifier !== wanted)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!fast || !wanted) return;

  const goalAt = new Date(fast.started_at).getTime() + fast.target_hours * 3600_000;
  if (goalAt <= Date.now()) return;
  if (!(await ensurePermission())) return;

  // Reschedule so edits to start time / target are picked up.
  await Notifications.cancelScheduledNotificationAsync(wanted);
  await Notifications.scheduleNotificationAsync({
    identifier: wanted,
    content: {
      title: 'Fasting goal reached 🎉',
      body: `You've completed your ${fast.target_hours}h fast.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: goalAt,
      channelId: CHANNEL_ID,
    },
  });
}
