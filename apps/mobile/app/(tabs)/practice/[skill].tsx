import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import type { Exercise, Skill } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { useApp } from '@/src/state/AppContext';

const SELF_RATING_OPTIONS = [
  { label: 'Got it wrong', accuracy: 20 },
  { label: 'Partly right', accuracy: 60 },
  { label: 'Nailed it', accuracy: 95 },
] as const;

export default function PracticeSessionScreen() {
  const { skill } = useLocalSearchParams<{ skill: Skill }>();
  const { api, userId, stageId } = useApp();
  const router = useRouter();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [ttsUri, setTtsUri] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const player = useAudioPlayer(ttsUri);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [hasRecording, setHasRecording] = useState(false);
  const recordingPlayer = useAudioPlayer(hasRecording ? recorder.uri : null);

  const loadExercise = useCallback(async () => {
    if (!userId || !skill) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const exercises = await api.listExercises(stageId, skill);
      setExercise(exercises[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercise');
    } finally {
      setLoading(false);
    }
  }, [api, userId, stageId, skill]);

  useEffect(() => {
    loadExercise();
  }, [loadExercise]);

  async function handlePlayPrompt() {
    if (!exercise) return;
    setTtsLoading(true);
    try {
      const result = await api.synthesizeSpeech(exercise.prompt);
      setTtsUri(api.resolveAssetUrl(result.audioUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'TTS failed (is OPENAI_API_KEY configured on the server?)');
    } finally {
      setTtsLoading(false);
    }
  }

  useEffect(() => {
    if (ttsUri) player.play();
  }, [ttsUri, player]);

  async function handleStartRecording() {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      setError('Microphone permission denied.');
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function handleStopRecording() {
    await recorder.stop();
    setHasRecording(true);
  }

  async function handleSelfRate(accuracy: number) {
    if (!exercise || !userId) return;
    setSubmitting(true);
    try {
      await api.submitAttempt(exercise.id, userId, {
        score: accuracy,
        accuracy,
        timeSpentSec: Math.round((Date.now() - startedAt) / 1000),
        mistakes: [],
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit attempt');
    } finally {
      setSubmitting(false);
    }
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

  if (!exercise) {
    return (
      <View style={styles.center}>
        <Text>No exercises available yet for {skill} at this stage.</Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Attempt recorded</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back to Practice</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.difficulty}>Difficulty {exercise.difficulty.toFixed(1)} / 10</Text>
      <Text style={styles.prompt}>{exercise.prompt}</Text>

      {skill === 'listening' && (
        <Pressable style={styles.button} onPress={handlePlayPrompt} disabled={ttsLoading}>
          <Text style={styles.buttonText}>{ttsLoading ? 'Synthesizing…' : '🔊 Play prompt'}</Text>
        </Pressable>
      )}

      {skill === 'speaking' && (
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={handleStartRecording}>
            <Text style={styles.buttonText}>🎙️ Record</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleStopRecording}>
            <Text style={styles.buttonText}>⏹ Stop</Text>
          </Pressable>
          {hasRecording && (
            <Pressable style={styles.button} onPress={() => recordingPlayer.play()}>
              <Text style={styles.buttonText}>▶️ Playback</Text>
            </Pressable>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>How did you do?</Text>
      <View style={styles.row}>
        {SELF_RATING_OPTIONS.map((opt) => (
          <Pressable key={opt.label} style={styles.button} disabled={submitting} onPress={() => handleSelfRate(opt.accuracy)}>
            <Text style={styles.buttonText}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  difficulty: { opacity: 0.6 },
  prompt: { fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  button: { backgroundColor: '#2e7d32', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  buttonText: { color: 'white', fontWeight: '600' },
  error: { color: '#c62828' },
});
