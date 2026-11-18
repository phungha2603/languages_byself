import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import type { BandStageStatus, IeltsBandStage, StageGateDecision } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { useApp } from '@/src/state/AppContext';

interface ProgressRow {
  stageId: string;
  status: BandStageStatus;
}

export default function RoadmapScreen() {
  const { api, userId, stageId, setStageId } = useApp();
  const [stages, setStages] = useState<IeltsBandStage[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [mockScore, setMockScore] = useState('70');
  const [decision, setDecision] = useState<StageGateDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const stageList = await api.listStages();
      setStages(stageList);
      if (userId) {
        const rows = (await api.getUserProgress(userId)) as ProgressRow[];
        setProgress(rows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roadmap');
    }
  }, [api, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function statusFor(stage: IeltsBandStage): BandStageStatus {
    if (stage.id === stageId) return 'in_progress';
    return progress.find((p) => p.stageId === stage.id)?.status ?? (stage.order === 0 ? 'unlocked' : 'locked');
  }

  async function handleEvaluate(stage: IeltsBandStage) {
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.evaluateGate(userId, stage.id, Number(mockScore) || null);
      setDecision(result);
      if (result.action === 'unlock_next_stage' && result.nextStageId) {
        await setStageId(result.nextStageId);
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {error && <Text style={styles.error}>{error}</Text>}
      {stages.map((stage) => {
        const status = statusFor(stage);
        const locked = status === 'locked';
        const expanded = expandedStageId === stage.id;
        return (
          <Pressable
            key={stage.id}
            style={[styles.card, locked && styles.cardLocked]}
            onPress={() => !locked && setExpandedStageId(expanded ? null : stage.id)}>
            <View style={styles.rowBetween}>
              <Text style={styles.stageLabel}>
                {locked ? '🔒 ' : status === 'completed' ? '✅ ' : ''}
                {stage.label}
              </Text>
              <Text style={styles.statusBadge}>{status}</Text>
            </View>
            <Text style={styles.description}>{stage.description}</Text>

            {expanded && !locked && (
              <View style={styles.criteriaBox}>
                <Text style={styles.sectionTitle}>Exit criteria</Text>
                <Text>Min accuracy per skill: {stage.exitCriteria.minSkillAccuracy.listening}%</Text>
                <Text>Min vocab retention: {stage.exitCriteria.minVocabRetention}%</Text>
                <Text>Min mock score: {stage.exitCriteria.minMockAssessmentScore}</Text>
                <Text>Max open grammar weaknesses: {stage.exitCriteria.maxOpenGrammarWeaknesses}</Text>

                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Mock assessment score</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={mockScore} onChangeText={setMockScore} />
                <Pressable style={styles.button} disabled={busy} onPress={() => handleEvaluate(stage)}>
                  <Text style={styles.buttonText}>{busy ? 'Evaluating…' : 'Evaluate stage gate'}</Text>
                </Pressable>

                {decision && decision.stageId === stage.id && (
                  <View style={styles.resultBox}>
                    <Text style={styles.sectionTitle}>Result: {decision.action}</Text>
                    {decision.evaluation.unmetCriteria.length === 0 ? (
                      <Text>All criteria met 🎉</Text>
                    ) : (
                      decision.evaluation.unmetCriteria.map((c, i) => <Text key={i}>• {c}</Text>)
                    )}
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
      {stages.length === 0 && <ActivityIndicator />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#00000015' },
  cardLocked: { opacity: 0.5 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stageLabel: { fontSize: 16, fontWeight: '700' },
  statusBadge: { opacity: 0.6, fontSize: 12, textTransform: 'uppercase' },
  description: { marginTop: 4, opacity: 0.7 },
  criteriaBox: { marginTop: 12, gap: 4 },
  sectionTitle: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#00000030', borderRadius: 8, padding: 8, marginVertical: 8, width: 100 },
  button: { backgroundColor: '#2e7d32', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
  resultBox: { marginTop: 12, gap: 2 },
  error: { color: '#c62828' },
});
