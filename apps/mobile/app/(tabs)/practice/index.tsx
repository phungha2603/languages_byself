import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import type { Skill, WeaknessProfile } from '@app/shared-types';
import { SKILLS } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { useApp } from '@/src/state/AppContext';

const SKILL_DESCRIPTIONS: Record<Skill, string> = {
  listening: 'Audio comprehension, dictation, note completion.',
  speaking: 'Shadowing, cue cards, Q&A practice.',
  reading: 'Multiple choice, True/False/Not Given, matching headings.',
  writing: 'Task 1 reports, Task 2 essays, grammar drills.',
};

export default function PracticeIndexScreen() {
  const { api, userId, stageId } = useApp();
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
      <View style={styles.center}>
        <Text>Create a profile in Settings first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {SKILLS.map((skill) => (
        <Pressable key={skill} style={styles.card} onPress={() => router.push(`/practice/${skill}`)}>
          <View style={styles.cardRow}>
            <Text style={styles.skillName}>{skill}</Text>
            {profile && <Text style={styles.mastery}>{profile.skillMastery[skill]}% mastery</Text>}
          </View>
          <Text style={styles.description}>{SKILL_DESCRIPTIONS[skill]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#00000015' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skillName: { fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  mastery: { opacity: 0.7 },
  description: { marginTop: 4, opacity: 0.7 },
});
