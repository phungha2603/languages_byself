import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { CEFR_LEVEL_BY_STAGE, type CefrLevel, type VocabItem } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Button } from '@/src/components/ui';
import { FlashcardSession } from '@/src/components/vocab/FlashcardSession';
import { useApp } from '@/src/state/AppContext';
import { useTheme } from '@/src/theme';
import { vocabLevelColors } from '@/src/theme/vocabLevelColors';

export default function VocabCumulativeReviewScreen() {
  const { stageId } = useLocalSearchParams<{ stageId: string }>();
  const { api, userId } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const [words, setWords] = useState<VocabItem[] | null>(null);

  useEffect(() => {
    if (!stageId || !userId) return;
    api
      .listReviewableVocab(userId, stageId)
      .then(setWords)
      .catch(() => setWords([]));
  }, [api, userId, stageId]);

  if (!userId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Create a profile in Settings first.</Text>
      </View>
    );
  }

  if (words === null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (words.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          You haven't studied any words yet — go study a topic first, then come back to test yourself.
        </Text>
        <Button label="Back" icon="arrow-back" variant="soft" onPress={() => router.back()} />
      </View>
    );
  }

  const level = (stageId ? CEFR_LEVEL_BY_STAGE[stageId] : undefined) as CefrLevel | undefined;
  const accent = level ? vocabLevelColors[level] : colors.primary;

  return <FlashcardSession words={words} accentColor={accent} onFinished={() => router.back()} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
});
