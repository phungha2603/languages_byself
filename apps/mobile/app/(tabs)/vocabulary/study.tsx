import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import type { VocabItem } from '@app/shared-types';

import { View } from '@/components/Themed';
import { FlashcardSession } from '@/src/components/vocab/FlashcardSession';
import { useApp } from '@/src/state/AppContext';
import { useTheme } from '@/src/theme';
import { vocabLevelColors } from '@/src/theme/vocabLevelColors';

export default function VocabStudyScreen() {
  const { levelId, chapter } = useLocalSearchParams<{ levelId: string; chapter: string }>();
  const { api, userId } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const [words, setWords] = useState<VocabItem[] | null>(null);
  const [accent, setAccent] = useState(colors.primary);

  useEffect(() => {
    if (!levelId || !chapter) return;
    api
      .listVocabChapters(levelId, userId ?? undefined)
      .then((groups) => {
        const match = groups.find((g) => g.chapter === chapter);
        setWords(match?.words ?? []);
      })
      .catch(() => setWords([]));
    api
      .listVocabLevels()
      .then((levels) => {
        const level = levels.find((l) => l.id === levelId);
        if (level) setAccent(vocabLevelColors[level.cefrLevel]);
      })
      .catch(() => {});
  }, [api, userId, levelId, chapter]);

  if (words === null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <FlashcardSession words={words} accentColor={accent} onFinished={() => router.back()} />;
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
