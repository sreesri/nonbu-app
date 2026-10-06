import { onlineManager, useIsMutating } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isQueuedWrite } from '@/api/writes';
import { radius, spacing, useTheme } from '@/lib/theme';

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const isOnline = () => onlineManager.isOnline();

/** Shown while offline: the app keeps working from saved data, and writes wait to sync. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, isOnline);
  const waiting = useIsMutating({ predicate: isQueuedWrite });
  const insets = useSafeAreaInsets();
  const t = useTheme();

  if (online) return null;
  const message =
    waiting > 0
      ? `Offline · ${waiting} ${waiting === 1 ? 'change' : 'changes'} will sync when you're back online`
      : 'Offline · showing saved data';
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: insets.top + spacing.sm,
        left: spacing.lg,
        right: spacing.lg,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          backgroundColor: t.banner.bg,
          color: t.banner.fg,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          overflow: 'hidden',
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
    </View>
  );
}
