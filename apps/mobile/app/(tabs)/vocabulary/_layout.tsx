import { Stack } from 'expo-router';
import { useTheme } from '@/src/theme';

export default function VocabularyLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="study" options={{ title: 'Flashcards' }} />
      <Stack.Screen name="review" options={{ title: 'Cumulative review' }} />
    </Stack>
  );
}
