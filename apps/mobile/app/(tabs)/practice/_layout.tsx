import { Stack } from 'expo-router';
import { useTheme } from '@/src/theme';

export default function PracticeLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[skill]" options={{ title: 'Practice session' }} />
    </Stack>
  );
}
