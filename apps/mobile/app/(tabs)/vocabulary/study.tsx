import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { CEFR_LEVEL_BY_STAGE, type CefrLevel, type VocabItem } from '@app/shared-types';

import { View } from '@/components/Themed';
import { FlashcardSession } from '@/src/components/vocab/FlashcardSession';
import { useApp } from '@/src/state/AppContext';
import { useTheme } from '@/src/theme';
import { vocabLevelColors } from '@/src/theme/vocabLevelColors';

export default function VocabStudyScreen() {
  const { stageId, topic } = useLocalSearchParams<{ stageId: string; topic: string }>();
  const { api, userId } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const [words, setWords] = useState<VocabItem[] | null>(null);

  useEffect(() => {
    if (!stageId || !topic) return;
    api
      .listVocabTopics(stageId, userId ?? undefined)
      .then((groups) => {
        const match = groups.find((g) => g.topic === topic);
        setWords(match?.words ?? []);
      })
      .catch(() => setWords([]));
  }, [api, userId, stageId, topic]);

  if (words === null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const level = (stageId ? CEFR_LEVEL_BY_STAGE[stageId] : undefined) as CefrLevel | undefined;
  const accent = level ? vocabLevelColors[level] : colors.primary;

  return <FlashcardSession words={words} accentColor={accent} onFinished={() => router.back()} />;
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
