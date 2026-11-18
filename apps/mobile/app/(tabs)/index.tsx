import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import type { NextSessionPlan, WeaknessProfile } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { MasteryBar } from '@/src/components/MasteryBar';
import { useApp } from '@/src/state/AppContext';

export default function DashboardScreen() {
  const { ready, api, userId, stageId } = useApp();
  const router = useRouter();
  const [profile, setProfile] = useState<WeaknessProfile | null>(null);
  const [plan, setPlan] = useState<NextSessionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileResult, planResult] = await Promise.all([
        api.getWeaknessProfile(userId, stageId),
        api.getNextSessionPlan(userId, stageId),
      ]);
      setProfile(profileResult);
      setPlan(planResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [api, userId, stageId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!ready) return null;

  if (!userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Welcome to English Coach</Text>
        <Text style={styles.subtitle}>Create a profile in Settings to get your personalized study plan.</Text>
        <Pressable style={styles.cta} onPress={() => router.push('/settings')}>
          <Text style={styles.ctaText}>Go to Settings</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text style={styles.title}>Your weak points</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {!profile && loading && <ActivityIndicator />}
      {profile && (
        <View style={styles.card}>
          {(['listening', 'speaking', 'reading', 'writing'] as const).map((skill) => (
            <MasteryBar key={skill} label={skill} value={profile.skillMastery[skill]} />
          ))}
        </View>
      )}

      {profile && profile.grammarWeaknesses.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recurring grammar issues</Text>
          {profile.grammarWeaknesses.slice(0, 5).map((w) => (
            <Text key={w.topic}>
              • {w.topic} ({w.occurrences}x, mastery {w.masteryScore}%)
            </Text>
          ))}
        </View>
      )}

      {plan && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recommended next session</Text>
          {plan.rationale.map((line, i) => (
            <Text key={i} style={styles.rationale}>
              • {line}
            </Text>
          ))}
          <Pressable style={styles.cta} onPress={() => router.push('/practice')}>
            <Text style={styles.ctaText}>Start practicing</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { textAlign: 'center', opacity: 0.7 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#00000015' },
  rationale: { marginBottom: 4 },
  error: { color: '#c62828' },
  cta: { marginTop: 12, backgroundColor: '#2e7d32', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  ctaText: { color: 'white', fontWeight: '600' },
});
