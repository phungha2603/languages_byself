import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SRS_RATINGS, type SrsRating, type VocabItem } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Button, CelebrationBadge, FlipCard } from '@/src/components/ui';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, palette, spacing, useTheme } from '@/src/theme';

const RATING_META: Record<SrsRating, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  again: { color: '#F43F5E', icon: 'close' },
  hard: { color: '#F59E0B', icon: 'remove' },
  good: { color: '#10B981', icon: 'checkmark' },
  easy: { color: '#6366F1', icon: 'checkmark-done' },
};

interface FlashcardSessionProps {
  words: VocabItem[];
  accentColor: string;
  onFinished: () => void;
}

/** One flip-card-at-a-time study session, used by both a single topic deck and a cumulative review. */
export function FlashcardSession({ words, accentColor, onFinished }: FlashcardSessionProps) {
  const { api, userId } = useApp();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState(false);

  if (words.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>No words here yet.</Text>
        <Button label="Back" icon="arrow-back" variant="soft" onPress={onFinished} />
      </View>
    );
  }

  if (index >= words.length) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <CelebrationBadge color={colors.success} icon="checkmark-done" />
        <Text style={[styles.doneTitle, { color: colors.textPrimary }]}>Deck complete!</Text>
        <Text style={[styles.doneSubtitle, { color: colors.textSecondary }]}>
          You went through {words.length} {words.length === 1 ? 'word' : 'words'}.
        </Text>
        <Button label="Back to Vocabulary" icon="arrow-back" onPress={onFinished} />
      </View>
    );
  }

  const current = words[index]!;
  const progress = (index / words.length) * 100;

  async function handleRate(r: SrsRating) {
    if (!userId) {
      setIndex((i) => i + 1);
      setRevealed(false);
      return;
    }
    setRating(true);
    try {
      await api.reviewSrsCard(userId, current.id, r);
    } catch {
      // Non-fatal — the card just won't be scheduled this time; the session still advances.
    } finally {
      setRating(false);
      setIndex((i) => i + 1);
      setRevealed(false);
    }
  }

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <View style={styles.progressRow}>
        <Text style={[styles.counter, { color: colors.textSecondary }]}>
          {index + 1} of {words.length}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
        </View>
      </View>

      <Pressable style={styles.cardPressable} onPress={() => setRevealed((r) => !r)}>
        <FlipCard
          flipped={revealed}
          front={
            <View style={[styles.face, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {current.partOfSpeech && (
                <Text style={[styles.pos, { color: colors.textSecondary }]}>{current.partOfSpeech}</Text>
              )}
              <Text style={[styles.headword, { color: colors.textPrimary }]}>{current.headword}</Text>
              {current.ipa && <Text style={[styles.ipa, { color: colors.textSecondary }]}>/{current.ipa}/</Text>}
              <View style={styles.hintRow}>
                <Ionicons name="hand-left-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.hint, { color: colors.textSecondary }]}>Tap to reveal</Text>
              </View>
            </View>
          }
          back={
            <LinearGradient colors={[accentColor, palette.violet500]} style={[styles.face, { borderColor: 'transparent' }]}>
              <Text style={styles.headwordBack}>{current.headword}</Text>
              {current.definitions.map((d, i) => (
                <Text key={i} style={styles.definition}>
                  {i + 1}. {d}
                </Text>
              ))}
              {current.examples.slice(0, 1).map((e, i) => (
                <Text key={i} style={styles.example}>
                  “{e}”
                </Text>
              ))}
              {current.translations?.vi && <Text style={styles.translation}>{current.translations.vi}</Text>}
            </LinearGradient>
          }
        />
      </Pressable>

      {revealed && (
        <View style={styles.ratingRow}>
          {SRS_RATINGS.map((r) => {
            const meta = RATING_META[r];
            return <Button key={r} label={r} icon={meta.icon} color={meta.color} loading={rating} onPress={() => handleRate(r)} />;
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', padding: spacing.xl, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  doneTitle: { fontFamily: fontFamily.display, fontSize: 22 },
  doneSubtitle: { fontFamily: fontFamily.regular, fontSize: 14, textAlign: 'center' },
  progressRow: { width: '100%', gap: spacing.xs, backgroundColor: 'transparent' },
  counter: { fontFamily: fontFamily.medium, fontSize: 12, textAlign: 'center' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  cardPressable: { width: '100%' },
  face: {
    minHeight: 260,
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pos: { fontFamily: fontFamily.regular, fontSize: 13, fontStyle: 'italic' },
  headword: { fontFamily: fontFamily.display, fontSize: 30, textAlign: 'center' },
  ipa: { fontFamily: fontFamily.regular, fontSize: 14 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, backgroundColor: 'transparent' },
  hint: { fontFamily: fontFamily.regular, fontSize: 13 },
  headwordBack: { fontFamily: fontFamily.display, fontSize: 26, color: '#fff', textAlign: 'center' },
  definition: { fontSize: 15, fontFamily: fontFamily.regular, color: '#fff', textAlign: 'center' },
  example: { fontStyle: 'italic', fontFamily: fontFamily.regular, color: '#E9D5FF', textAlign: 'center' },
  translation: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: '#fff',
    backgroundColor: '#FFFFFF26',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: spacing.xs,
  },
  ratingRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center', backgroundColor: 'transparent' },
});
