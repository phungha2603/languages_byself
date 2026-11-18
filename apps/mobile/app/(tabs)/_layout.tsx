import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }} tintColor={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="srs"
        options={{
          title: 'SRS Review',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'rectangle.stack.fill', android: 'style', web: 'style' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="roadmap"
        options={{
          title: 'IELTS Roadmap',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'map.fill', android: 'map', web: 'map' }} tintColor={color} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }} tintColor={color} size={26} />
          ),
        }}
      />
    </Tabs>
  );
}
