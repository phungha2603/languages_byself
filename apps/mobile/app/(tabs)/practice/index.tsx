import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NextSessionPlan, Skill, WeaknessProfile } from '@app/shared-types';
import { SKILLS } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Card, FadeInView, ProgressRing, ScreenHeader } from '@/src/components/ui';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, spacing, useTheme } from '@/src/theme';
import { skillMeta } from '@/src/theme/skillMeta';

const SKILL_DESCRIPTIONS: Record<Skill, string> = {
  listening: 'Audio comprehension, dictation, note completion.',
  speaking: 'Shadowing, cue cards, Q&A practice.',
  reading: 'Multiple choice, True/False/Not Given, matching headings.',
  writing: 'Task 1 reports, Task 2 essays, grammar drills.',
};

export default function PracticeIndexScreen() {
  const { api, userId, stageId } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<WeaknessProfile | null>(null);
  const [plan, setPlan] = useState<NextSessionPlan | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      api.getWeaknessProfile(userId, stageId).then(setProfile).catch(() => setProfile(null));
      api.getNextSessionPlan(userId, stageId).then(setPlan).catch(() => setPlan(null));
    }, [api, userId, stageId]),
  );

  if (!userId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text>Create a profile in Settings first.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <ScreenHeader title="Practice" subtitle="Pick a skill to work on" />

      {plan && plan.rationale.length > 0 && (
        <View style={{ paddingHorizontal: spacing.lg, backgroundColor: 'transparent' }}>
          <Card accentColor={colors.primary} style={{ gap: spacing.xs }}>
            <View style={styles.focusHeaderRow}>
              <Ionicons name="compass" size={16} color={colors.primary} />
              <Text style={[styles.focusTitle, { color: colors.textPrimary }]}>Focus today</Text>
            </View>
            {plan.rationale.slice(0, 2).map((line, i) => (
              <Text key={i} style={[styles.focusLine, { color: colors.textSecondary }]}>
                {line}
              </Text>
            ))}
          </Card>
        </View>
      )}

      <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: 'transparent' }}>
        {SKILLS.map((skill, i) => {
          const meta = skillMeta[skill];
          const mastery = profile?.skillMastery[skill] ?? 0;
          const isFocus = plan?.focusSkills.includes(skill) ?? false;
          return (
            <FadeInView key={skill} delay={i * 70}>
              <Pressable onPress={() => router.push(`/practice/${skill}`)}>
                <Card accentColor={meta.color} style={styles.row}>
                  <ProgressRing value={mastery} color={meta.color} trackColor={`${meta.color}22`} size={48} strokeWidth={5} icon={meta.icon} />
                  <View style={styles.textCol}>
                    <View style={styles.skillNameRow}>
                      <Text style={[styles.skillName, { color: colors.textPrimary }]}>{meta.label}</Text>
                      {isFocus && (
                        <View style={[styles.focusBadge, { backgroundColor: `${colors.primary}1F` }]}>
                          <Text style={[styles.focusBadgeText, { color: colors.primary }]}>Focus</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>{SKILL_DESCRIPTIONS[skill]}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </Card>
              </Pressable>
            </FadeInView>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  textCol: { flex: 1, gap: 2, backgroundColor: 'transparent' },
  skillNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'transparent' },
  skillName: { fontFamily: fontFamily.semibold, fontSize: 16 },
  description: { fontFamily: fontFamily.regular, fontSize: 12.5 },
  focusHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'transparent' },
  focusTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  focusLine: { fontFamily: fontFamily.regular, fontSize: 13 },
  focusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  focusBadgeText: { fontFamily: fontFamily.semibold, fontSize: 10.5 },
});
