import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CEFR_LEVEL_BY_STAGE, type CefrLevel, type IeltsBandStage, type VocabItem } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Badge, Button, Card, ScreenHeader } from '@/src/components/ui';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, spacing, useTheme } from '@/src/theme';
import { notify } from '@/src/utils/notify';

export default function VocabularyScreen() {
  const { api, userId, stageId } = useApp();
  const { colors } = useTheme();
  const [stages, setStages] = useState<IeltsBandStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [userPickedLevel, setUserPickedLevel] = useState(false);
  const [words, setWords] = useState<VocabItem[]>([]);
  const [savedVocabIds, setSavedVocabIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listStages()
      .then(setStages)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  // Keeps the level picker pinned to the user's current target stage — e.g. right after
  // they create a profile or change their target band in Settings — until they explicitly
  // pick a different level to browse themselves.
  useEffect(() => {
    if (!userPickedLevel) setSelectedStageId(stageId);
  }, [stageId, userPickedLevel]);

  function handlePickLevel(id: string) {
    setUserPickedLevel(true);
    setSelectedStageId(id);
  }

  const load = useCallback(async () => {
    if (!selectedStageId) return;
    setLoading(true);
    setError(null);
    try {
      const [vocab, myCards] = await Promise.all([
        api.listVocabByStage(selectedStageId),
        userId ? api.listMyCardVocabIds(userId) : Promise.resolve([]),
      ]);
      setWords(vocab);
      setSavedVocabIds(new Set(myCards.map((c) => c.vocabId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocabulary');
    } finally {
      setLoading(false);
    }
  }, [api, userId, selectedStageId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleAdd(word: VocabItem) {
    if (!userId) {
      notify('Create a profile first', 'Go to Settings to create a profile so your words are saved for review.');
      return;
    }
    setAddingId(word.id);
    try {
      await api.addSrsCard(userId, word.id);
      setSavedVocabIds((prev) => new Set(prev).add(word.id));
    } catch (err) {
      notify('Could not add word', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <ScreenHeader title="Vocabulary" subtitle="Build your word bank, level by level" />

      <View style={styles.levelRow}>
        {stages.map((stage) => {
          const level: CefrLevel | undefined = CEFR_LEVEL_BY_STAGE[stage.id];
          const selected = stage.id === selectedStageId;
          const isTarget = stage.id === stageId;
          return (
            <Pressable key={stage.id} onPress={() => handlePickLevel(stage.id)}>
              <View
                style={[
                  styles.levelPill,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : colors.surface,
                  },
                ]}>
                <Text style={[styles.levelPillText, { color: selected ? colors.textOnPrimary : colors.textPrimary }]}>
                  {level ?? '?'}
                </Text>
                {isTarget && (
                  <View style={[styles.targetDot, { backgroundColor: selected ? colors.textOnPrimary : colors.primary }]} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedStageId && (
        <Text style={[styles.levelCaption, { color: colors.textSecondary }]}>
          {stages.find((s) => s.id === selectedStageId)?.label}
          {selectedStageId === stageId ? ' · your target level' : ''}
        </Text>
      )}

      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />}

      <View style={styles.wordList}>
        {!loading &&
          words.map((word) => {
            const added = savedVocabIds.has(word.id);
            return (
              <Card key={word.id} style={{ gap: 4 }}>
                <View style={styles.wordHeaderRow}>
                  <View style={styles.wordTitleCol}>
                    <Text style={[styles.headword, { color: colors.textPrimary }]}>{word.headword}</Text>
                    <View style={styles.metaRow}>
                      {word.partOfSpeech && <Text style={[styles.pos, { color: colors.textSecondary }]}>{word.partOfSpeech}</Text>}
                      {word.ipa && <Text style={[styles.ipa, { color: colors.textSecondary }]}>/{word.ipa}/</Text>}
                    </View>
                  </View>
                  <Button
                    label={added ? 'Added' : 'Add'}
                    icon={added ? 'checkmark-circle' : 'add-circle-outline'}
                    variant={added ? 'soft' : 'outline'}
                    color={added ? colors.success : colors.primary}
                    size="sm"
                    disabled={added}
                    loading={addingId === word.id}
                    onPress={() => handleAdd(word)}
                  />
                </View>
                {word.definitions.map((d, i) => (
                  <Text key={i} style={[styles.definition, { color: colors.textPrimary }]}>
                    {i + 1}. {d}
                  </Text>
                ))}
                {word.examples.slice(0, 1).map((e, i) => (
                  <Text key={i} style={[styles.example, { color: colors.textSecondary }]}>
                    “{e}”
                  </Text>
                ))}
                {word.translations?.vi && <Badge label={word.translations.vi} color={colors.info} icon="language" />}
              </Card>
            );
          })}

        {!loading && words.length === 0 && !error && (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
            No words curated for this level yet.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxxl },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  levelPillText: { fontFamily: fontFamily.bold, fontSize: 14 },
  targetDot: { width: 5, height: 5, borderRadius: 2.5 },
  levelCaption: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  error: { fontFamily: fontFamily.medium, color: '#F43F5E', paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  wordList: { gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  wordHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, backgroundColor: 'transparent' },
  wordTitleCol: { flex: 1, backgroundColor: 'transparent' },
  headword: { fontFamily: fontFamily.display, fontSize: 19 },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 2, backgroundColor: 'transparent' },
  pos: { fontFamily: fontFamily.regular, fontSize: 12.5, fontStyle: 'italic' },
  ipa: { fontFamily: fontFamily.regular, fontSize: 12.5 },
  definition: { fontFamily: fontFamily.regular, fontSize: 14, marginTop: 4 },
  example: { fontFamily: fontFamily.regular, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
});
