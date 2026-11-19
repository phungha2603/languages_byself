import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SRS_RATINGS, type SrsRating } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { AnimatedProgressBar, Button, Card, FlipCard } from '@/src/components/ui';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, palette, spacing, useTheme } from '@/src/theme';
import type { SrsCardDto } from '@/src/api/client';

const RATING_META: Record<SrsRating, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  again: { color: '#F43F5E', icon: 'close' },
  hard: { color: '#F59E0B', icon: 'remove' },
  good: { color: '#10B981', icon: 'checkmark' },
  easy: { color: '#6366F1', icon: 'checkmark-done' },
};

export default function SrsReviewScreen() {
  const { api, userId } = useApp();
  const { colors } = useTheme();
  const [queue, setQueue] = useState<SrsCardDto[]>([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newWord, setNewWord] = useState('');
  const [addingWord, setAddingWord] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const cards = await api.getDueSrsCards(userId, 20);
      setQueue(cards);
      setTotalDue(cards.length);
      setRevealed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load due cards');
    } finally {
      setLoading(false);
    }
  }, [api, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function handleReveal() {
    setRevealed((r) => !r);
  }

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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add word');
    } finally {
      setAddingWord(false);
    }
  }

  async function handleRate(rating: SrsRating) {
    if (!userId || queue.length === 0) return;
    const [current, ...rest] = queue;
    try {
      await api.reviewSrsCard(userId, current.vocabId, rating);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    }
    setQueue(rest);
    setRevealed(false);
  }

  const screenStyle = { backgroundColor: colors.background };

  if (!userId) {
    return (
      <View style={[styles.center, screenStyle]}>
        <Text>Create a profile in Settings first.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, screenStyle]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const addWordBox = (
    <Card style={{ width: '100%', gap: spacing.sm }}>
      <View style={styles.addWordHeader}>
        <Ionicons name="add-circle" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Add a word to review</Text>
      </View>
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
  );

  if (queue.length === 0) {
    return (
      <View style={[styles.center, screenStyle]}>
        {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
        <View style={[styles.doneIcon, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="checkmark-done" size={36} color={colors.success} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>All caught up!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>No vocabulary due for review right now.</Text>
        <Button label="Refresh" icon="refresh" variant="soft" onPress={load} />
        {addWordBox}
      </View>
    );
  }

  const current = queue[0];
  const progress = totalDue > 0 ? ((totalDue - queue.length) / totalDue) * 100 : 0;

  return (
    <View style={[styles.center, screenStyle]}>
      {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      <View style={styles.progressRow}>
        <Text style={[styles.counter, { color: colors.textSecondary }]}>
          {queue.length} of {totalDue} due
        </Text>
        <AnimatedProgressBar value={progress} color={colors.primary} trackColor={colors.surfaceAlt} />
      </View>

      <Pressable style={{ width: '100%' }} onPress={handleReveal}>
        <FlipCard
          flipped={revealed}
          front={
            <View style={[styles.flashcard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.headword, { color: colors.textPrimary }]}>{current.vocabItem.headword}</Text>
              {current.vocabItem.ipa && <Text style={[styles.ipa, { color: colors.textSecondary }]}>/{current.vocabItem.ipa}/</Text>}
              <View style={styles.hintRow}>
                <Ionicons name="hand-left-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.hint, { color: colors.textSecondary }]}>Tap to reveal</Text>
              </View>
            </View>
          }
          back={
            <LinearGradient colors={[palette.violet600, palette.violet500]} style={[styles.flashcard, { borderColor: 'transparent' }]}>
              <Text style={[styles.headword, { color: '#fff' }]}>{current.vocabItem.headword}</Text>
              {current.vocabItem.ipa && <Text style={[styles.ipa, { color: '#E9D5FF' }]}>/{current.vocabItem.ipa}/</Text>}
              <View style={styles.back}>
                {current.vocabItem.definitions.map((d, i) => (
                  <Text key={i} style={styles.definition}>
                    {i + 1}. {d}
                  </Text>
                ))}
                {current.vocabItem.examples.slice(0, 2).map((e, i) => (
                  <Text key={i} style={styles.example}>
                    “{e}”
                  </Text>
                ))}
              </View>
            </LinearGradient>
          }
        />
      </Pressable>

      {revealed && (
        <View style={styles.row}>
          {SRS_RATINGS.map((rating) => {
            const meta = RATING_META[rating];
            return (
              <Button key={rating} label={rating} icon={meta.icon} color={meta.color} onPress={() => handleRate(rating)} />
            );
          })}
        </View>
      )}

      {addWordBox}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  title: { fontFamily: fontFamily.display, fontSize: 22 },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: 14 },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 14 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  progressRow: { width: '100%', gap: spacing.xs, backgroundColor: 'transparent' },
  counter: { fontFamily: fontFamily.medium, fontSize: 12, textAlign: 'center' },
  flashcard: {
    minHeight: 240,
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  headword: { fontFamily: fontFamily.display, fontSize: 30 },
  ipa: { fontFamily: fontFamily.regular, fontSize: 14 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, backgroundColor: 'transparent' },
  hint: { fontFamily: fontFamily.regular, fontSize: 13 },
  back: { marginTop: spacing.lg, gap: 6, alignSelf: 'stretch', backgroundColor: 'transparent' },
  definition: { fontSize: 15, fontFamily: fontFamily.regular, color: '#fff' },
  example: { fontStyle: 'italic', fontFamily: fontFamily.regular, color: '#E9D5FF' },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center', backgroundColor: 'transparent' },
  error: { fontFamily: fontFamily.medium },
  addWordHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'transparent' },
  addWordInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, fontFamily: fontFamily.regular },
});
