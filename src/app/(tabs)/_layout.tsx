import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Text, type ColorValue } from 'react-native';

import { useCurrentSession } from '@/api/hooks';
import { syncSessionNotification } from '@/lib/notifications';
import { useTheme } from '@/lib/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 20 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const t = useTheme();
  const current = useCurrentSession();

  // Lives here rather than in one screen because a session can be switched from Home or Fast.
  // Best-effort: a missing permission or scheduling failure must not break the app.
  useEffect(() => {
    if (current.isSuccess) syncSessionNotification(current.data).catch(() => {});
  }, [current.isSuccess, current.data]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.tabBar.active,
        tabBarInactiveTintColor: t.tabBar.inactive,
        tabBarStyle: { backgroundColor: t.tabBar.bg, borderTopColor: t.tabBar.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('⌂') }} />
      <Tabs.Screen name="fast" options={{ title: 'Fast', tabBarIcon: icon('⏱') }} />
      <Tabs.Screen name="food" options={{ title: 'Food', tabBarIcon: icon('🍽') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('📈') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙︎') }} />
    </Tabs>
  );
}
