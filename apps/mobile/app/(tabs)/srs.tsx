import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SrsRetentionStats, VocabCefrLevel } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Button, Card, ProgressRing, ScreenHeader } from '@/src/components/ui';
import { FlashcardSession } from '@/src/components/vocab/FlashcardSession';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, spacing, useTheme } from '@/src/theme';
import { vocabLevelColors } from '@/src/theme/vocabLevelColors';
import type { SrsCardDto } from '@/src/api/client';

export default function SrsReviewScreen() {
  const { api, userId, stageId } = useApp();
  const { colors } = useTheme();
  const [queue, setQueue] = useState<SrsCardDto[] | null>(null);
  const [retention, setRetention] = useState<SrsRetentionStats | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [addingWord, setAddingWord] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const [cards, retentionResult] = await Promise.all([
        api.getDueSrsCards(userId, 20),
        api.getRetention(userId, stageId).catch(() => null),
      ]);
      setQueue(cards);
      setRetention(retentionResult);
      // FlashcardSession copies `words` into its own state once on mount — remounting it via a
      // changing key is what makes it pick up the freshly-reloaded due queue.
      setSessionKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load due cards');
    }
  }, [api, userId, stageId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleAddWord() {
    if (!userId || !newWord.trim()) return;
    setAddingWord(true);
    setError(null);
    try {
      const lookup = await api.lookupWord(newWord.trim());
      if (!lookup.found || lookup.entries.length === 0) {
        setError(`Could not find a dictionary entry for "${newWord.trim()}".`);
        return;
      }
      await api.addSrsCard(userId, lookup.entries[0].id);
      setNewWord('');
      setShowAddWord(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add word');
    } finally {
      setAddingWord(false);
    }
  }

  const screenStyle = { backgroundColor: colors.background };

  if (!userId) {
    return (
      <View style={[styles.center, screenStyle]}>
        <Text>Create a profile in Settings first.</Text>
      </View>
    );
  }

  if (queue === null) {
    return (
      <View style={[styles.center, screenStyle]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const words = queue.map((c) => c.vocabItem);
  const cefrLevels = new Set(words.map((w) => w.cefrLevel).filter((l): l is VocabCefrLevel => !!l));
  const singleLevel = cefrLevels.size === 1 ? [...cefrLevels][0] : undefined;
  const accent = singleLevel ? vocabLevelColors[singleLevel] : colors.primary;

  const addWordPanel = (
    <View style={styles.addWordWrap}>
      <Pressable style={styles.addWordToggle} onPress={() => setShowAddWord((v) => !v)}>
        <Ionicons name={showAddWord ? 'remove-circle-outline' : 'add-circle-outline'} size={16} color={colors.textSecondary} />
        <Text style={[styles.addWordToggleText, { color: colors.textSecondary }]}>Add a specific word to review</Text>
      </Pressable>
      {showAddWord && (
        <Card style={{ gap: spacing.sm }}>
          <View style={styles.row}>
            <TextInput
              style={[styles.addWordInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surfaceAlt }]}
              value={newWord}
              onChangeText={setNewWord}
              placeholder="e.g. resilient"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
            <Button label={addingWord ? 'Adding…' : 'Add'} loading={addingWord} disabled={!newWord.trim()} onPress={handleAddWord} />
          </View>
        </Card>
      )}
    </View>
  );

  const statsRow = retention && (
    <View style={styles.statsRow}>
      <View style={styles.statsItem}>
        <ProgressRing value={retention.retentionRate} color={colors.success} trackColor={colors.surfaceAlt} size={48} strokeWidth={5} />
        <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Retention</Text>
      </View>
      <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
      <View style={styles.statsItem}>
        <Text style={[styles.statsBigNumber, { color: colors.textPrimary }]}>{retention.matureCards}</Text>
        <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Mature / {retention.totalCards}</Text>
      </View>
      <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
      <View style={styles.statsItem}>
        <Text style={[styles.statsBigNumber, { color: colors.textPrimary }]}>{words.length}</Text>
        <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Due now</Text>
      </View>
    </View>
  );

  if (words.length === 0) {
    return (
      <View style={[styles.center, screenStyle]}>
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}
        {statsRow}
        <View style={[styles.doneIcon, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="checkmark-done" size={36} color={colors.success} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>All caught up!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>No vocabulary due for review right now.</Text>
        <Button label="Refresh" icon="refresh" variant="soft" onPress={load} />
        {addWordPanel}
      </View>
    );
  }

  return (
    <View style={[{ flex: 1 }, screenStyle]}>
      <ScreenHeader title="Review" subtitle="Spaced repetition across everything you've studied" />
      {statsRow}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft, marginHorizontal: spacing.lg }]}>
          <Ionicons name="warning" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}
      <FlashcardSession
        key={sessionKey}
        words={words}
        accentColor={accent}
        cefrLevel={singleLevel}
        finishedLabel="Done for now"
        onFinished={load}
      />
      {addWordPanel}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  title: { fontFamily: fontFamily.display, fontSize: 22 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 14 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center', backgroundColor: 'transparent' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12 },
  errorText: { fontFamily: fontFamily.medium, flex: 1, fontSize: 13 },
  addWordInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, fontFamily: fontFamily.regular },
  addWordWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm, backgroundColor: 'transparent' },
  addWordToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', padding: spacing.sm },
  addWordToggleText: { fontFamily: fontFamily.medium, fontSize: 12.5 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  statsItem: { alignItems: 'center', gap: 2, backgroundColor: 'transparent' },
  statsDivider: { width: 1, height: 36 },
  statsBigNumber: { fontFamily: fontFamily.display, fontSize: 24 },
  statsLabel: { fontFamily: fontFamily.regular, fontSize: 11 },
});
