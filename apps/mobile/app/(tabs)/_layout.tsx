import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useTheme, fontFamily } from '@/src/theme';

function tabIcon(filled: keyof typeof Ionicons.glyphMap, outline: keyof typeof Ionicons.glyphMap) {
  return ({ color, focused }: { color: unknown; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={23} color={color as string} />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: Platform.select({ ios: 88, default: 64 }),
          paddingTop: 8,
        },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen
        name="practice"
        options={{ title: 'Practice', headerShown: false, tabBarIcon: tabIcon('school', 'school-outline') }}
      />
      <Tabs.Screen name="srs" options={{ title: 'Review', tabBarIcon: tabIcon('albums', 'albums-outline') }} />
      <Tabs.Screen name="roadmap" options={{ title: 'Roadmap', tabBarIcon: tabIcon('map', 'map-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tabIcon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
