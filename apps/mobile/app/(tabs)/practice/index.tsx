import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Skill, WeaknessProfile } from '@app/shared-types';
import { SKILLS } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Card, ProgressRing, ScreenHeader } from '@/src/components/ui';
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

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      api.getWeaknessProfile(userId, stageId).then(setProfile).catch(() => setProfile(null));
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
      <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: 'transparent' }}>
        {SKILLS.map((skill) => {
          const meta = skillMeta[skill];
          const mastery = profile?.skillMastery[skill] ?? 0;
          return (
            <Pressable key={skill} onPress={() => router.push(`/practice/${skill}`)}>
              <Card accentColor={meta.color} style={styles.row}>
                <ProgressRing value={mastery} color={meta.color} trackColor={`${meta.color}22`} size={48} strokeWidth={5} icon={meta.icon} />
                <View style={styles.textCol}>
                  <Text style={[styles.skillName, { color: colors.textPrimary }]}>{meta.label}</Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>{SKILL_DESCRIPTIONS[skill]}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Card>
            </Pressable>
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
  skillName: { fontFamily: fontFamily.semibold, fontSize: 16 },
  description: { fontFamily: fontFamily.regular, fontSize: 12.5 },
});
