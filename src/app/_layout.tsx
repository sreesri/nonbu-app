import { focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useMe } from '@/api/hooks';
import { persistOptions, queryClient, resumeQueuedWrites } from '@/api/queryClient';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { OfflineBanner } from '@/components/OfflineBanner';
import { UpdateBanner } from '@/components/UpdateBanner';
import { Loading } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { WidgetSync } from '@/widget/WidgetSync';

// Refetch when the app returns to the foreground.
AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));

function RootNavigator() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  const me = useMe(signedIn);
  const t = useTheme();

  if (status === 'loading' || (signedIn && me.isPending)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.background }}>
        <Loading />
      </View>
    );
  }

  // If /me fails (e.g. offline) fall through to the tabs; the gate re-applies once it loads.
  const onboarding = signedIn && me.data?.onboarded_at === null;
  return (
    <>
      {signedIn ? <WidgetSync /> : null}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.header.bg },
          headerTintColor: t.header.fg,
          contentStyle: { backgroundColor: t.background },
        }}
      >
        <Stack.Protected guard={onboarding}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarding}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="food/new" options={{ title: 'Add food', presentation: 'modal' }} />
          <Stack.Screen name="food/[id]" options={{ title: 'Edit food', presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Restores the last session's data from disk first, so screens render without waiting on the network. */}
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions} onSuccess={resumeQueuedWrites}>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
          <OfflineBanner />
          <UpdateBanner />
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
