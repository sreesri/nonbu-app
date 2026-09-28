import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, useTheme } from '@/lib/theme';

/**
 * Over-the-air updates: expo-updates checks on launch; we also check whenever the
 * app returns to the foreground, download in the background, and offer a restart.
 */
export function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  useEffect(() => {
    if (!Updates.isEnabled || __DEV__) return;
    const check = async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // offline or update server unreachable; try again next time
      }
    };
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, []);

  if (!isUpdatePending) return null;
  return (
    <Pressable
      onPress={() => Updates.reloadAsync()}
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: insets.bottom + 72,
        backgroundColor: t.primary,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <Text style={{ color: t.primaryText, fontWeight: '600', textAlign: 'center' }}>
        A new version is ready — tap to restart
      </Text>
    </Pressable>
  );
}
