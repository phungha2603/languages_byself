import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  VOCAB_UNLOCK_THRESHOLD,
  type VocabChapterGroup,
  type VocabLevel,
  type VocabLevelProgress,
  type VocabLevelStatus,
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
  const { api, userId } = useApp();
  const { colors } = useTheme();
  const router = useRouter();

  const [levels, setLevels] = useState<VocabLevel[]>([]);
  const [progress, setProgress] = useState<VocabLevelProgress[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [userPickedLevel, setUserPickedLevel] = useState(false);
  const [chapters, setChapters] = useState<VocabChapterGroup[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultProgress = useCallback(
    (levelList: VocabLevel[]): VocabLevelProgress[] =>
      levelList.map((level, i) => ({
        levelId: level.id,
        cefrLevel: level.cefrLevel,
        bandLabel: level.bandLabel,
        storyTitle: level.storyTitle,
        totalWords: 0,
        masteredWords: 0,
        masteryPercent: 0,
        status: i === 0 ? 'unlocked' : 'locked',
        isAnchor: i === 0,
      })),
    [],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const levelList = await api.listVocabLevels();
      setLevels(levelList);
      const levelProgress = userId ? await api.getVocabLevelProgress(userId) : defaultProgress(levelList);
      setProgress(levelProgress);

      if (!userPickedLevel) {
        const anchorEntry = levelProgress.find((p) => p.isAnchor);
        if (anchorEntry) setSelectedLevelId(anchorEntry.levelId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocabulary progress');
    }
  }, [api, userId, userPickedLevel, defaultProgress]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!selectedLevelId) return;
      setLoadingChapters(true);
      api
        .listVocabChapters(selectedLevelId, userId ?? undefined)
        .then(setChapters)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load chapters'))
        .finally(() => setLoadingChapters(false));
    }, [api, userId, selectedLevelId]),
  );

  function handlePickLevel(entry: VocabLevelProgress) {
    if (entry.status === 'locked') {
      notify('Level locked', `Reach ${VOCAB_UNLOCK_THRESHOLD}% mastery on the level before it to unlock this one.`);
      return;
    }
    setUserPickedLevel(true);
    setSelectedLevelId(entry.levelId);
  }

  const selectedEntry = useMemo(() => progress.find((p) => p.levelId === selectedLevelId), [progress, selectedLevelId]);
  const cumulativeMastered = useMemo(() => {
    if (!selectedEntry) return 0;
    const upToOrder = levels.find((l) => l.id === selectedEntry.levelId)?.order ?? 0;
    return progress
      .filter((p) => (levels.find((l) => l.id === p.levelId)?.order ?? 0) <= upToOrder)
      .reduce((sum, p) => sum + p.masteredWords, 0);
  }, [progress, levels, selectedEntry]);

  const accent = selectedEntry ? vocabLevelColors[selectedEntry.cefrLevel] : colors.primary;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <ScreenHeader title="Vocabulary" subtitle="An expedition through the words IELTS rewards" />

      <View style={styles.levelRow}>
        {progress.map((entry) => {
          const selected = entry.levelId === selectedLevelId;
          const levelColor = vocabLevelColors[entry.cefrLevel];
          const locked = entry.status === 'locked';
          return (
            <Pressable key={entry.levelId} onPress={() => handlePickLevel(entry)}>
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
                {entry.isAnchor && (
                  <View style={[styles.anchorDot, { backgroundColor: selected ? colors.textOnPrimary : levelColor }]} />
                )}
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
              <View style={styles.summaryTitleCol}>
                <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>{selectedEntry.storyTitle}</Text>
                <Text style={[styles.summaryBand, { color: colors.textSecondary }]}>
                  Band {selectedEntry.bandLabel} · {selectedEntry.cefrLevel}
                  {selectedEntry.isAnchor ? ' · your target level' : ''}
                </Text>
              </View>
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
              label={cumulativeMastered === 0 ? 'Study a chapter first' : `Test old words (${cumulativeMastered})`}
              icon="shuffle"
              variant="soft"
              color={accent}
              disabled={cumulativeMastered === 0}
              onPress={() => router.push({ pathname: '/vocabulary/review', params: { levelId: selectedEntry.levelId } })}
              fullWidth
            />
          </Card>
        </FadeInView>
      )}

      <View style={styles.chapterList}>
        {loadingChapters && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}
        {!loadingChapters &&
          chapters.map((group, i) => {
            const complete = group.totalWords > 0 && group.masteredWords >= group.totalWords;
            return (
              <FadeInView key={group.chapter} delay={i * 60}>
                <Pressable
                  onPress={() =>
                    selectedLevelId &&
                    router.push({ pathname: '/vocabulary/study', params: { levelId: selectedLevelId, chapter: group.chapter } })
                  }>
                  <Card accentColor={accent} style={{ gap: spacing.sm }}>
                    <View style={styles.chapterHeaderRow}>
                      <View style={[styles.chapterIcon, { backgroundColor: `${accent}1F` }]}>
                        <Text style={[styles.chapterNumber, { color: accent }]}>{i + 1}</Text>
                      </View>
                      <View style={styles.chapterTitleCol}>
                        <Text style={[styles.chapterTitle, { color: colors.textPrimary }]}>{group.chapter}</Text>
                        <Text style={[styles.chapterCaption, { color: colors.textSecondary }]}>
                          {group.masteredWords}/{group.totalWords} words
                        </Text>
                      </View>
                      <Ionicons name={complete ? 'checkmark-done' : 'chevron-forward'} size={20} color={complete ? colors.success : colors.textSecondary} />
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
  anchorDot: { width: 5, height: 5, borderRadius: 2.5 },
  error: { fontFamily: fontFamily.medium, color: '#F43F5E', paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'transparent',
  },
  summaryTitleCol: { flex: 1, gap: 2, backgroundColor: 'transparent' },
  summaryTitle: { fontFamily: fontFamily.display, fontSize: 17 },
  summaryBand: { fontFamily: fontFamily.regular, fontSize: 12.5 },
  summaryCaption: { fontFamily: fontFamily.regular, fontSize: 12.5 },
  chapterList: { gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  chapterHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'transparent' },
  chapterIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chapterNumber: { fontFamily: fontFamily.bold, fontSize: 15 },
  chapterTitleCol: { flex: 1, backgroundColor: 'transparent' },
  chapterTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  chapterCaption: { fontFamily: fontFamily.regular, fontSize: 12 },
});
