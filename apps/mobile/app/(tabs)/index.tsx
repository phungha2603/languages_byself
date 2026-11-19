import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SKILLS, type NextSessionPlan, type VocabCefrLevel, type WeaknessProfile } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Badge, Button, Card, CelebrationBadge, FadeInView, ProgressRing, ScreenHeader, Sparkline } from '@/src/components/ui';
import { LevelScene } from '@/src/components/vocab/LevelScene';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, palette, spacing, useTheme } from '@/src/theme';
import { skillMeta } from '@/src/theme/skillMeta';

export default function DashboardScreen() {
  const { ready, api, userId, stageId } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<WeaknessProfile | null>(null);
  const [plan, setPlan] = useState<NextSessionPlan | null>(null);
  const [anchorLevel, setAnchorLevel] = useState<VocabCefrLevel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileResult, planResult, vocabProgress] = await Promise.all([
        api.getWeaknessProfile(userId, stageId),
        api.getNextSessionPlan(userId, stageId),
        api.getVocabLevelProgress(userId).catch(() => []),
      ]);
      setProfile(profileResult);
      setPlan(planResult);
      setAnchorLevel(vocabProgress.find((p) => p.isAnchor)?.cefrLevel ?? null);
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <LinearGradient colors={[palette.violet600, palette.violet400]} style={styles.welcomeIcon}>
          <Ionicons name="sparkles" size={36} color="#fff" />
        </LinearGradient>
        <Text style={styles.welcomeTitle}>Welcome to English Coach</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Create a profile in Settings to get your personalized study plan.
        </Text>
        <Button label="Go to Settings" icon="arrow-forward" iconPosition="right" onPress={() => router.push('/settings')} />
      </View>
    );
  }

  const overallMastery = profile
    ? Math.round(SKILLS.reduce((sum, s) => sum + profile.skillMastery[s], 0) / SKILLS.length)
    : 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}>
      <ScreenHeader title="Dashboard" subtitle={`Stage · ${stageId}`} />

      <View style={styles.heroCard}>
        {anchorLevel && <LevelScene cefrLevel={anchorLevel} />}
        <LinearGradient
          colors={[`${colors.primaryPressed}E6`, `${colors.primary}CC`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroRow}>
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <Text style={styles.heroLabel}>Overall mastery</Text>
            <Text style={styles.heroValue}>{overallMastery}%</Text>
          </View>
          <ProgressRing value={overallMastery} color="#fff" trackColor="#FFFFFF33" size={64} strokeWidth={6} />
        </View>
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="warning" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}
      {!profile && loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />}

      {profile && (
        <View style={styles.ringGrid}>
          {SKILLS.map((skill, i) => {
            const meta = skillMeta[skill];
            const trend = profile.skillAccuracyTrend[skill];
            return (
              <FadeInView key={skill} delay={i * 70} style={{ flex: 1 }}>
                <Pressable onPress={() => router.push(`/practice/${skill}`)}>
                  <Card style={styles.ringCard} padded>
                    <ProgressRing value={profile.skillMastery[skill]} color={meta.color} trackColor={`${meta.color}22`} size={56} strokeWidth={6} />
                    <Ionicons name={meta.icon} size={14} color={meta.color} style={{ marginTop: spacing.sm }} />
                    <Text style={[styles.ringLabel, { color: colors.textPrimary }]}>{meta.label}</Text>
                    <View style={{ marginTop: 4, backgroundColor: 'transparent' }}>
                      {trend.length >= 2 ? (
                        <Sparkline data={trend} color={meta.color} />
                      ) : (
                        <Text style={[styles.sparklinePlaceholder, { color: colors.textSecondary }]}>No data yet</Text>
                      )}
                    </View>
                  </Card>
                </Pressable>
              </FadeInView>
            );
          })}
        </View>
      )}

      {profile &&
        (profile.grammarWeaknesses.length > 0 ? (
          <Card>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="alert-circle" size={18} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recurring grammar issues</Text>
            </View>
            {profile.grammarWeaknesses.slice(0, 5).map((w) => (
              <View key={w.topic} style={styles.bulletRow}>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                  {w.topic.replace(/_/g, ' ')} · seen {w.occurrences}x
                </Text>
                <Badge label={`${w.masteryScore}%`} color={w.masteryScore < 70 ? colors.danger : colors.success} />
              </View>
            ))}
          </Card>
        ) : (
          <Card style={styles.allClearCard}>
            <CelebrationBadge color={colors.success} icon="shield-checkmark" size={56} />
            <Text style={[styles.allClearText, { color: colors.textPrimary }]}>No recurring grammar issues right now</Text>
          </Card>
        ))}

      {profile && profile.vocabWeaknesses.length > 0 && (
        <Card accentColor={colors.danger}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="trending-down" size={18} color={colors.danger} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Words slipping away</Text>
          </View>
          {profile.vocabWeaknesses.slice(0, 5).map((w) => (
            <View key={w.vocabId} style={styles.bulletRow}>
              <Text style={[styles.bulletText, { color: colors.textSecondary, textTransform: 'none' }]}>{w.headword}</Text>
              <Badge label={`${w.lapses} lapse${w.lapses === 1 ? '' : 's'}`} color={colors.danger} />
            </View>
          ))}
          <View style={{ marginTop: spacing.sm, backgroundColor: 'transparent' }}>
            <Button label="Review in Vocabulary" icon="refresh" variant="soft" color={colors.danger} onPress={() => router.push('/vocabulary')} fullWidth />
          </View>
        </Card>
      )}

      {plan && (
        <Card accentColor={colors.primary}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="rocket" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recommended next session</Text>
          </View>
          {plan.rationale.map((line, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.rationale, { color: colors.textSecondary }]}>{line}</Text>
            </View>
          ))}
          <View style={{ marginTop: spacing.md, backgroundColor: 'transparent' }}>
            <Button label="Start practicing" icon="play" onPress={() => router.push('/practice')} fullWidth />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  welcomeIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  welcomeTitle: { fontFamily: fontFamily.display, fontSize: 22, textAlign: 'center' },
  subtitle: { textAlign: 'center', fontFamily: fontFamily.regular, fontSize: 14, marginBottom: spacing.sm },
  heroCard: { borderRadius: 24, padding: spacing.xl, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
  heroLabel: { color: '#E9D5FF', fontFamily: fontFamily.medium, fontSize: 13 },
  heroValue: { color: '#fff', fontFamily: fontFamily.display, fontSize: 34, marginTop: 2 },
  ringGrid: { flexDirection: 'row', gap: spacing.sm, backgroundColor: 'transparent' },
  ringCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  ringLabel: { fontFamily: fontFamily.medium, fontSize: 12, marginTop: 4 },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: 'transparent',
  },
  bulletText: { fontFamily: fontFamily.regular, fontSize: 13, flex: 1, textTransform: 'capitalize' },
  rationale: { fontFamily: fontFamily.regular, fontSize: 13, flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12 },
  errorText: { fontFamily: fontFamily.medium, flex: 1, fontSize: 13 },
  sparklinePlaceholder: { fontFamily: fontFamily.regular, fontSize: 10 },
  allClearCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  allClearText: { fontFamily: fontFamily.medium, fontSize: 13.5, textAlign: 'center' },
});
