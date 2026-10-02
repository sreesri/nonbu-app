import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Text, type ColorValue } from 'react-native';

import { useCurrentFast } from '@/api/hooks';
import { syncFastNotification } from '@/lib/notifications';
import { useTheme } from '@/lib/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 20 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const t = useTheme();
  const current = useCurrentFast();

  // Lives here rather than in one screen because a fast can be started from Home or Fast.
  useEffect(() => {
    if (current.isSuccess) syncFastNotification(current.data).catch(() => {});
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
