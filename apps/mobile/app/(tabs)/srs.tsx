import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SRS_RATINGS, type SrsRating } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { useApp, } from '@/src/state/AppContext';
import type { SrsCardDto } from '@/src/api/client';

export default function SrsReviewScreen() {
  const { api, userId } = useApp();
  const [queue, setQueue] = useState<SrsCardDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const cards = await api.getDueSrsCards(userId, 20);
      setQueue(cards);
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

  if (!userId) {
    return (
      <View style={styles.center}>
        <Text>Create a profile in Settings first.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (queue.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>All caught up! 🎉</Text>
        <Text style={styles.subtitle}>No vocabulary due for review right now.</Text>
        <Pressable style={styles.button} onPress={load}>
          <Text style={styles.buttonText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  const current = queue[0];

  return (
    <View style={styles.center}>
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.counter}>{queue.length} card(s) due</Text>
      <Pressable style={styles.card} onPress={() => setRevealed((r) => !r)}>
        <Text style={styles.headword}>{current.vocabItem.headword}</Text>
        {current.vocabItem.ipa && <Text style={styles.ipa}>/{current.vocabItem.ipa}/</Text>}
        {revealed && (
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
        )}
        {!revealed && <Text style={styles.hint}>Tap to reveal</Text>}
      </Pressable>

      {revealed && (
        <View style={styles.row}>
          {SRS_RATINGS.map((rating) => (
            <Pressable key={rating} style={[styles.ratingButton, RATING_COLORS[rating]]} onPress={() => handleRate(rating)}>
              <Text style={styles.buttonText}>{rating}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const RATING_COLORS: Record<SrsRating, { backgroundColor: string }> = {
  again: { backgroundColor: '#c62828' },
  hard: { backgroundColor: '#ef6c00' },
  good: { backgroundColor: '#2e7d32' },
  easy: { backgroundColor: '#1565c0' },
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { opacity: 0.7 },
  counter: { opacity: 0.6 },
  card: {
    width: '100%',
    minHeight: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00000020',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headword: { fontSize: 28, fontWeight: '700' },
  ipa: { opacity: 0.6 },
  hint: { opacity: 0.4, marginTop: 16 },
  back: { marginTop: 16, gap: 6, alignSelf: 'stretch' },
  definition: { fontSize: 16 },
  example: { fontStyle: 'italic', opacity: 0.7 },
  row: { flexDirection: 'row', gap: 8 },
  ratingButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  button: { backgroundColor: '#2e7d32', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  buttonText: { color: 'white', fontWeight: '600', textTransform: 'capitalize' },
  error: { color: '#c62828' },
});
