import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useAudioPlayer, useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import type { Exercise, GradingResult, Skill } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Badge, Button, Card } from '@/src/components/ui';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, spacing, useTheme } from '@/src/theme';
import { skillMeta } from '@/src/theme/skillMeta';

const SELF_RATING_OPTIONS = [
  { label: 'Got it wrong', accuracy: 20, icon: 'close-circle' as const },
  { label: 'Partly right', accuracy: 60, icon: 'remove-circle' as const },
  { label: 'Nailed it', accuracy: 95, icon: 'checkmark-circle' as const },
];

const AI_GRADED_WRITING_TYPES = new Set(['writing_task1_report', 'writing_task2_essay']);
const AI_GRADED_SPEAKING_TYPES = new Set(['speaking_cue_card', 'speaking_qa']);

function bandColor(band: number, colors: { danger: string; warning: string; success: string }) {
  if (band < 5) return colors.danger;
  if (band < 6.5) return colors.warning;
  return colors.success;
}

export default function PracticeSessionScreen() {
  const { skill } = useLocalSearchParams<{ skill: Skill }>();
  const { api, userId, stageId } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const meta = skill ? skillMeta[skill] : undefined;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);

  const [essay, setEssay] = useState('');
  const [transcript, setTranscript] = useState('');

  const [ttsUri, setTtsUri] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const player = useAudioPlayer(ttsUri);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [hasRecording, setHasRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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
    setIsRecording(true);
  }

  async function handleStopRecording() {
    await recorder.stop();
    setIsRecording(false);
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

  async function handleGradeWriting() {
    if (!exercise || !userId || !essay.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.gradeWritingExercise(exercise.id, userId, essay.trim());
      setGradingResult(result.grading);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI grading failed (is OPENAI_API_KEY configured on the server?)');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGradeSpeaking() {
    if (!exercise || !userId || !transcript.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.gradeSpeakingExercise(exercise.id, userId, transcript.trim());
      setGradingResult(result.grading);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI grading failed (is OPENAI_API_KEY configured on the server?)');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <View style={[styles.center, screenStyle]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[styles.center, screenStyle]}>
        <Ionicons name="file-tray-outline" size={40} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary }}>No exercises available yet for {skill} at this stage.</Text>
      </View>
    );
  }

  if (submitted) {
    const band = gradingResult?.overallBand ?? null;
    return (
      <ScrollView style={screenStyle} contentContainerStyle={styles.content}>
        <View style={[styles.resultHero, { backgroundColor: band !== null ? `${bandColor(band, colors)}1A` : colors.successSoft }]}>
          <Ionicons
            name={band !== null ? 'ribbon' : 'checkmark-done-circle'}
            size={40}
            color={band !== null ? bandColor(band, colors) : colors.success}
          />
          <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
            {band !== null ? `Band ${band}` : 'Attempt recorded'}
          </Text>
        </View>

        {gradingResult && (
          <Card style={{ gap: spacing.md }}>
            {gradingResult.criteria.map((c) => (
              <View key={c.criterion} style={styles.criterionBlock}>
                <View style={styles.criterionHeader}>
                  <Text style={[styles.criterionName, { color: colors.textPrimary }]}>{c.criterion}</Text>
                  <Badge label={`Band ${c.band}`} color={bandColor(c.band, colors)} />
                </View>
                <View style={[styles.miniTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.miniFill, { width: `${(c.band / 9) * 100}%`, backgroundColor: bandColor(c.band, colors) }]} />
                </View>
                <Text style={[styles.criterionRationale, { color: colors.textSecondary }]}>{c.rationale}</Text>
              </View>
            ))}

            <View style={styles.divider} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Feedback</Text>
            <Text style={{ color: colors.textSecondary }}>{gradingResult.feedback}</Text>

            {gradingResult.mistakes.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Issues found</Text>
                {gradingResult.mistakes.map((m, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
                    <Text style={{ color: colors.textSecondary, flex: 1 }}>
                      [{m.category}] {m.detail}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </Card>
        )}
        <Button label="Back to Practice" icon="arrow-back" onPress={() => router.back()} variant="soft" fullWidth />
      </ScrollView>
    );
  }

  const isAiGradedWriting = AI_GRADED_WRITING_TYPES.has(exercise.type);
  const isAiGradedSpeaking = AI_GRADED_SPEAKING_TYPES.has(exercise.type);
  const accent = meta?.color ?? colors.primary;

  return (
    <ScrollView style={screenStyle} contentContainerStyle={styles.content}>
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name="warning" size={16} color={colors.danger} />
          <Text style={{ color: colors.danger, flex: 1 }}>{error}</Text>
        </View>
      )}

      <Card accentColor={accent} style={{ gap: spacing.sm }}>
        <View style={styles.promptHeader}>
          {meta && <Ionicons name={meta.icon} size={16} color={accent} />}
          <Badge label={`Difficulty ${exercise.difficulty.toFixed(1)}/10`} color={accent} />
        </View>
        <Text style={[styles.prompt, { color: colors.textPrimary }]}>{exercise.prompt}</Text>
      </Card>

      {skill === 'listening' && (
        <Button
          label={ttsLoading ? 'Synthesizing…' : 'Play prompt'}
          icon="volume-high"
          onPress={handlePlayPrompt}
          loading={ttsLoading}
          color={accent}
          fullWidth
        />
      )}

      {skill === 'speaking' && (
        <View style={styles.row}>
          {!isRecording ? (
            <Button label="Record" icon="mic" onPress={handleStartRecording} color={accent} />
          ) : (
            <Button label="Stop" icon="stop" onPress={handleStopRecording} variant="danger" />
          )}
          {hasRecording && <Button label="Playback" icon="play" variant="soft" color={accent} onPress={() => recordingPlayer.play()} />}
        </View>
      )}

      {isAiGradedWriting ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Write your response</Text>
          <TextInput
            style={[styles.essayInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            value={essay}
            onChangeText={setEssay}
            multiline
            placeholder="Type your essay here…"
            placeholderTextColor={colors.textSecondary}
            textAlignVertical="top"
          />
          <Button
            label={submitting ? 'Grading…' : 'Submit for AI grading'}
            icon="sparkles"
            loading={submitting}
            disabled={!essay.trim()}
            onPress={handleGradeWriting}
            color={accent}
            fullWidth
          />
        </View>
      ) : isAiGradedSpeaking ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transcript of what you said</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Voice-to-text upload isn&apos;t wired up yet — type or paste what you said (e.g. from the recording above) to get rubric
            feedback now.
          </Text>
          <TextInput
            style={[styles.essayInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface }]}
            value={transcript}
            onChangeText={setTranscript}
            multiline
            placeholder="Type your spoken response here…"
            placeholderTextColor={colors.textSecondary}
            textAlignVertical="top"
          />
          <Button
            label={submitting ? 'Grading…' : 'Submit for AI grading'}
            icon="sparkles"
            loading={submitting}
            disabled={!transcript.trim()}
            onPress={handleGradeSpeaking}
            color={accent}
            fullWidth
          />
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>How did you do?</Text>
          <View style={styles.row}>
            {SELF_RATING_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                label={opt.label}
                icon={opt.icon}
                variant="soft"
                color={opt.accuracy < 40 ? colors.danger : opt.accuracy < 80 ? colors.warning : colors.success}
                disabled={submitting}
                onPress={() => handleSelfRate(opt.accuracy)}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  hint: { fontFamily: fontFamily.regular, fontSize: 12 },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  promptHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  prompt: { fontFamily: fontFamily.medium, fontSize: 17, lineHeight: 24 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12 },
  essayInput: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
  resultHero: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: 20 },
  resultTitle: { fontFamily: fontFamily.display, fontSize: 24 },
  criterionBlock: { gap: 6 },
  criterionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  criterionName: { fontFamily: fontFamily.semibold, fontSize: 14 },
  criterionRationale: { fontFamily: fontFamily.regular, fontSize: 12.5, lineHeight: 17 },
  miniTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 3 },
  divider: { height: 1, backgroundColor: '#00000012', marginVertical: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: 4 },
});
