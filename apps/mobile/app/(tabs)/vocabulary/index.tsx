import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CEFR_LEVEL_BY_STAGE,
  VOCAB_UNLOCK_THRESHOLD,
  type CefrLevel,
  type IeltsBandStage,
  type VocabLevelProgress,
  type VocabLevelStatus,
  type VocabTopicGroup,
} from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { AnimatedProgressBar, Badge, Button, Card, FadeInView, ScreenHeader } from '@/src/components/ui';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, spacing, useTheme } from '@/src/theme';
import { vocabLevelColors } from '@/src/theme/vocabLevelColors';
import { notify } from '@/src/utils/notify';

const STATUS_ICON: Record<VocabLevelStatus, keyof typeof Ionicons.glyphMap> = {
  locked: 'lock-closed',
  unlocked: 'school',
  completed: 'checkmark-circle',
};

export default function VocabularyIndexScreen() {
  const { api, userId, stageId } = useApp();
  const { colors } = useTheme();
  const router = useRouter();

  const [stages, setStages] = useState<IeltsBandStage[]>([]);
  const [progress, setProgress] = useState<VocabLevelProgress[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [userPickedLevel, setUserPickedLevel] = useState(false);
  const [topics, setTopics] = useState<VocabTopicGroup[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultProgress = useCallback(
    (stageList: IeltsBandStage[]): VocabLevelProgress[] =>
      stageList.map((stage, i) => ({
        stageId: stage.id,
        cefrLevel: (CEFR_LEVEL_BY_STAGE[stage.id] ?? 'A1') as CefrLevel,
        stageLabel: stage.label,
        totalWords: 0,
        masteredWords: 0,
        masteryPercent: 0,
        status: i === 0 ? 'unlocked' : 'locked',
      })),
    [],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const stageList = await api.listStages();
      setStages(stageList);
      const levelProgress = userId ? await api.getVocabLevelProgress(userId) : defaultProgress(stageList);
      setProgress(levelProgress);

      if (!userPickedLevel) {
        const targetEntry = levelProgress.find((p) => p.stageId === stageId);
        const fallback = [...levelProgress].reverse().find((p) => p.status !== 'locked') ?? levelProgress[0];
        const next = targetEntry && targetEntry.status !== 'locked' ? targetEntry : fallback;
        if (next) setSelectedStageId(next.stageId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocabulary progress');
    }
  }, [api, userId, stageId, userPickedLevel, defaultProgress]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!selectedStageId) return;
      setLoadingTopics(true);
      api
        .listVocabTopics(selectedStageId, userId ?? undefined)
        .then(setTopics)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load topics'))
        .finally(() => setLoadingTopics(false));
    }, [api, userId, selectedStageId]),
  );

  function handlePickLevel(entry: VocabLevelProgress) {
    if (entry.status === 'locked') {
      notify('Level locked', `Reach ${VOCAB_UNLOCK_THRESHOLD}% mastery on the level before it to unlock this one.`);
      return;
    }
    setUserPickedLevel(true);
    setSelectedStageId(entry.stageId);
  }

  const selectedEntry = useMemo(() => progress.find((p) => p.stageId === selectedStageId), [progress, selectedStageId]);
  const cumulativeMastered = useMemo(() => {
    if (!selectedEntry) return 0;
    const upToOrder = stages.find((s) => s.id === selectedEntry.stageId)?.order ?? 0;
    return progress
      .filter((p) => (stages.find((s) => s.id === p.stageId)?.order ?? 0) <= upToOrder)
      .reduce((sum, p) => sum + p.masteredWords, 0);
  }, [progress, stages, selectedEntry]);

  const accent = selectedEntry ? vocabLevelColors[selectedEntry.cefrLevel] : colors.primary;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <ScreenHeader title="Vocabulary" subtitle="Level up your word bank, topic by topic" />

      <View style={styles.levelRow}>
        {progress.map((entry) => {
          const selected = entry.stageId === selectedStageId;
          const levelColor = vocabLevelColors[entry.cefrLevel];
          const locked = entry.status === 'locked';
          return (
            <Pressable key={entry.stageId} onPress={() => handlePickLevel(entry)}>
              <View
                style={[
                  styles.levelPill,
                  {
                    borderColor: selected ? levelColor : colors.border,
                    backgroundColor: selected ? levelColor : colors.surface,
                    opacity: locked ? 0.55 : 1,
                  },
                ]}>
                <Ionicons
                  name={STATUS_ICON[entry.status]}
                  size={13}
                  color={selected ? colors.textOnPrimary : locked ? colors.textSecondary : levelColor}
                />
                <Text style={[styles.levelPillText, { color: selected ? colors.textOnPrimary : colors.textPrimary }]}>
                  {entry.cefrLevel}
                </Text>
              </View>
            </Pressable>
          );
        })}
        {progress.length === 0 && <ActivityIndicator color={colors.primary} />}
      </View>

      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      {selectedEntry && (
        <FadeInView style={{ paddingHorizontal: spacing.lg }}>
          <Card accentColor={accent} style={{ gap: spacing.sm }}>
            <View style={styles.summaryHeaderRow}>
              <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>{selectedEntry.stageLabel}</Text>
              <Badge
                label={selectedEntry.status === 'completed' ? 'Mastered' : `${selectedEntry.masteryPercent}%`}
                color={selectedEntry.status === 'completed' ? colors.success : accent}
                icon={selectedEntry.status === 'completed' ? 'checkmark-circle' : 'trending-up'}
              />
            </View>
            <AnimatedProgressBar value={selectedEntry.masteryPercent} color={accent} trackColor={colors.surfaceAlt} />
            <Text style={[styles.summaryCaption, { color: colors.textSecondary }]}>
              {selectedEntry.masteredWords} of {selectedEntry.totalWords} words studied · unlock the next level at{' '}
              {VOCAB_UNLOCK_THRESHOLD}%
            </Text>
            <Button
              label={cumulativeMastered === 0 ? 'Study a topic first' : `Test old words (${cumulativeMastered})`}
              icon="shuffle"
              variant="soft"
              color={accent}
              disabled={cumulativeMastered === 0}
              onPress={() => router.push({ pathname: '/vocabulary/review', params: { stageId: selectedEntry.stageId } })}
              fullWidth
            />
          </Card>
        </FadeInView>
      )}

      <View style={styles.topicList}>
        {loadingTopics && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}
        {!loadingTopics &&
          topics.map((group, i) => {
            const complete = group.totalWords > 0 && group.masteredWords >= group.totalWords;
            return (
              <FadeInView key={group.topic} delay={i * 60}>
                <Pressable
                  onPress={() =>
                    selectedStageId &&
                    router.push({ pathname: '/vocabulary/study', params: { stageId: selectedStageId, topic: group.topic } })
                  }>
                  <Card accentColor={accent} style={{ gap: spacing.sm }}>
                    <View style={styles.topicHeaderRow}>
                      <View style={[styles.topicIcon, { backgroundColor: `${accent}1F` }]}>
                        <Ionicons name={complete ? 'checkmark-done' : 'albums-outline'} size={18} color={accent} />
                      </View>
                      <View style={styles.topicTitleCol}>
                        <Text style={[styles.topicTitle, { color: colors.textPrimary }]}>{group.topic}</Text>
                        <Text style={[styles.topicCaption, { color: colors.textSecondary }]}>
                          {group.masteredWords}/{group.totalWords} words
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                    <AnimatedProgressBar
                      value={group.totalWords === 0 ? 0 : (group.masteredWords / group.totalWords) * 100}
                      color={accent}
                      trackColor={colors.surfaceAlt}
                      height={5}
                    />
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
    paddingHorizontal: 16,
  },
  levelPillText: { fontFamily: fontFamily.bold, fontSize: 14 },
  error: { fontFamily: fontFamily.medium, color: '#F43F5E', paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'transparent',
  },
  summaryTitle: { fontFamily: fontFamily.semibold, fontSize: 16, flexShrink: 1 },
  summaryCaption: { fontFamily: fontFamily.regular, fontSize: 12.5 },
  topicList: { gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  topicHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'transparent' },
  topicIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topicTitleCol: { flex: 1, backgroundColor: 'transparent' },
  topicTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  topicCaption: { fontFamily: fontFamily.regular, fontSize: 12 },
});
