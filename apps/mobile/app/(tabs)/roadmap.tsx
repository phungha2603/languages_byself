import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BandStageStatus, IeltsBandStage, StageGateDecision } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Badge, Button, Card, ScreenHeader } from '@/src/components/ui';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, spacing, useTheme } from '@/src/theme';

interface ProgressRow {
  stageId: string;
  status: BandStageStatus;
}

const STATUS_META: Record<BandStageStatus, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  locked: { icon: 'lock-closed', label: 'Locked' },
  unlocked: { icon: 'lock-open', label: 'Unlocked' },
  in_progress: { icon: 'flash', label: 'In progress' },
  completed: { icon: 'checkmark-circle', label: 'Completed' },
};

export default function RoadmapScreen() {
  const { api, userId, stageId, setStageId } = useApp();
  const { colors } = useTheme();
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

  function colorFor(status: BandStageStatus): string {
    if (status === 'completed') return colors.success;
    if (status === 'in_progress') return colors.primary;
    if (status === 'unlocked') return colors.info;
    return colors.textSecondary;
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
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <ScreenHeader title="IELTS Roadmap" subtitle="Your path from Foundation to Band 8+" />
      {error && <Text style={[styles.error, { color: colors.danger, marginHorizontal: spacing.lg }]}>{error}</Text>}

      <View style={{ paddingHorizontal: spacing.lg, backgroundColor: 'transparent' }}>
        {stages.map((stage, index) => {
          const status = statusFor(stage);
          const locked = status === 'locked';
          const expanded = expandedStageId === stage.id;
          const dotColor = colorFor(status);
          const isLast = index === stages.length - 1;

          return (
            <View key={stage.id} style={styles.timelineRow}>
              <View style={styles.timelineCol}>
                <View style={[styles.dot, { backgroundColor: locked ? colors.surfaceAlt : dotColor, borderColor: dotColor }]}>
                  <Ionicons name={STATUS_META[status].icon} size={14} color={locked ? colors.textSecondary : '#fff'} />
                </View>
                {!isLast && <View style={[styles.line, { backgroundColor: locked ? colors.border : dotColor }]} />}
              </View>

              <Pressable style={styles.cardWrap} onPress={() => !locked && setExpandedStageId(expanded ? null : stage.id)}>
                <Card accentColor={locked ? colors.border : dotColor} style={[locked && styles.cardLocked]}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.stageLabel, { color: colors.textPrimary }]}>{stage.label}</Text>
                    <Badge label={STATUS_META[status].label} color={dotColor} icon={STATUS_META[status].icon} />
                  </View>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>{stage.description}</Text>

                  {expanded && !locked && (
                    <View style={styles.criteriaBox}>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Exit criteria</Text>
                      <CriteriaRow icon="trending-up" label="Min accuracy per skill" value={`${stage.exitCriteria.minSkillAccuracy.listening}%`} colors={colors} />
                      <CriteriaRow icon="albums" label="Min vocab retention" value={`${stage.exitCriteria.minVocabRetention}%`} colors={colors} />
                      <CriteriaRow icon="document-text" label="Min mock score" value={`${stage.exitCriteria.minMockAssessmentScore}`} colors={colors} />
                      <CriteriaRow icon="construct" label="Max open grammar gaps" value={`${stage.exitCriteria.maxOpenGrammarWeaknesses}`} colors={colors} />

                      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.md }]}>Mock assessment score</Text>
                      <TextInput
                        style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surfaceAlt }]}
                        keyboardType="numeric"
                        value={mockScore}
                        onChangeText={setMockScore}
                      />
                      <Button
                        label={busy ? 'Evaluating…' : 'Evaluate stage gate'}
                        icon="shield-checkmark"
                        loading={busy}
                        color={dotColor}
                        onPress={() => handleEvaluate(stage)}
                        fullWidth
                      />

                      {decision && decision.stageId === stage.id && (
                        <View style={[styles.resultBox, { backgroundColor: decision.evaluation.passed ? colors.successSoft : colors.warningSoft }]}>
                          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Result: {decision.action.replace(/_/g, ' ')}</Text>
                          {decision.evaluation.unmetCriteria.length === 0 ? (
                            <Text style={{ color: colors.textSecondary }}>All criteria met 🎉</Text>
                          ) : (
                            decision.evaluation.unmetCriteria.map((c, i) => (
                              <Text key={i} style={{ color: colors.textSecondary, fontSize: 12.5 }}>
                                • {c}
                              </Text>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              </Pressable>
            </View>
          );
        })}
        {stages.length === 0 && <ActivityIndicator color={colors.primary} />}
      </View>
    </ScrollView>
  );
}

function CriteriaRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: { textSecondary: string; textPrimary: string };
}) {
  return (
    <View style={styles.criteriaRow}>
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text style={{ color: colors.textSecondary, flex: 1, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 13 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxxl },
  timelineRow: { flexDirection: 'row', gap: spacing.sm },
  timelineCol: { alignItems: 'center', width: 32 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  line: { flex: 1, width: 2, marginVertical: 4, minHeight: 20 },
  cardWrap: { flex: 1, marginBottom: spacing.md },
  cardLocked: { opacity: 0.55 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'transparent',
  },
  stageLabel: { fontFamily: fontFamily.semibold, fontSize: 15, flexShrink: 1 },
  description: { marginTop: 4, fontFamily: fontFamily.regular, fontSize: 13 },
  criteriaBox: { marginTop: spacing.sm, gap: 6, backgroundColor: 'transparent' },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: 13 },
  criteriaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'transparent' },
  divider: { height: 1, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderRadius: 10, padding: 8, marginVertical: spacing.sm, width: 100, fontFamily: fontFamily.regular },
  resultBox: { marginTop: spacing.md, gap: 2, padding: spacing.md, borderRadius: 12 },
  error: { fontFamily: fontFamily.medium },
});
