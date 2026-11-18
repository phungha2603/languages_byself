import { Stack } from 'expo-router';

export default function PracticeLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Practice' }} />
      <Stack.Screen name="[skill]" options={{ title: 'Session' }} />
    </Stack>
  );
}
