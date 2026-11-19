import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SKILLS,
  type BandStageStatus,
  type IeltsBandStage,
  type SrsRetentionStats,
  type StageGateDecision,
  type WeaknessProfile,
} from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { AnimatedProgressBar, Badge, Button, Card, CelebrationBadge, FadeInView, ProgressRing, ScreenHeader } from '@/src/components/ui';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, spacing, useTheme, type ThemeColors } from '@/src/theme';
import { skillMeta } from '@/src/theme/skillMeta';

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
  const [profile, setProfile] = useState<WeaknessProfile | null>(null);
  const [retention, setRetention] = useState<SrsRetentionStats | null>(null);
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
        const [rows, profileResult, retentionResult] = await Promise.all([
          api.getUserProgress(userId) as Promise<ProgressRow[]>,
          api.getWeaknessProfile(userId, stageId).catch(() => null),
          api.getRetention(userId, stageId).catch(() => null),
        ]);
        setProgress(rows);
        setProfile(profileResult);
        setRetention(retentionResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roadmap');
    }
  }, [api, userId, stageId]);

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

  /**
   * How close the learner is to this stage's exit criteria right now — skill accuracy and vocab
   * retention come from the same profile/retention data regardless of which stage is queried
   * (they're not stage-scoped), so this just compares current ability against each stage's own
   * thresholds. Mock assessment score isn't included (it's a one-off manual input, not a running
   * ability signal).
   */
  function criteriaProgress(stage: IeltsBandStage) {
    const skillRows = SKILLS.map((skill) => ({
      skill,
      current: profile?.skillMastery[skill] ?? 0,
      target: stage.exitCriteria.minSkillAccuracy[skill],
    }));
    const vocabCurrent = retention?.retentionRate ?? 0;
    const vocabTarget = stage.exitCriteria.minVocabRetention;
    const grammarCurrent = profile?.grammarWeaknesses.length ?? 0;
    const grammarTarget = stage.exitCriteria.maxOpenGrammarWeaknesses;

    const metCount =
      skillRows.filter((r) => r.current >= r.target).length +
      (vocabCurrent >= vocabTarget ? 1 : 0) +
      (grammarCurrent <= grammarTarget ? 1 : 0);
    const percent = Math.round((metCount / (skillRows.length + 2)) * 100);

    return { skillRows, vocabCurrent, vocabTarget, grammarCurrent, grammarTarget, percent };
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

          const progressInfo = !locked ? criteriaProgress(stage) : null;

          return (
            <FadeInView key={stage.id} delay={index * 70} style={styles.timelineRow}>
              <View style={styles.timelineCol}>
                {locked ? (
                  <View style={[styles.dot, { backgroundColor: colors.surfaceAlt, borderColor: dotColor }]}>
                    <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
                  </View>
                ) : (
                  <ProgressRing value={progressInfo!.percent} color={dotColor} trackColor={`${dotColor}22`} size={28} strokeWidth={3} icon={STATUS_META[status].icon} />
                )}
                {!isLast && <View style={[styles.line, { backgroundColor: locked ? colors.border : dotColor }]} />}
              </View>

              {locked ? (
                <Card accentColor={colors.border} style={[styles.cardWrap, styles.cardLocked]}>
                  <View style={styles.rowBetween}>
                    <View style={{ backgroundColor: 'transparent' }}>
                      <Text style={[styles.stageLabel, { color: colors.textPrimary }]}>{stage.label}</Text>
                      <Text style={[styles.lockedBand, { color: colors.textSecondary }]}>
                        Band {stage.minBand.toFixed(1)} – {stage.maxBand.toFixed(1)}
                      </Text>
                    </View>
                    <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
                  </View>
                </Card>
              ) : (
                <Pressable style={styles.cardWrap} onPress={() => setExpandedStageId(expanded ? null : stage.id)}>
                  <Card accentColor={dotColor}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.stageLabel, { color: colors.textPrimary }]}>{stage.label}</Text>
                      <Badge label={STATUS_META[status].label} color={dotColor} icon={STATUS_META[status].icon} />
                    </View>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>{stage.description}</Text>

                    {expanded && (
                      <View style={styles.criteriaBox}>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Exit criteria — how close you are</Text>

                        {progressInfo!.skillRows.map((row) => (
                          <CriterionBar
                            key={row.skill}
                            icon={skillMeta[row.skill].icon}
                            label={skillMeta[row.skill].label}
                            current={row.current}
                            target={row.target}
                            unit="%"
                            colors={colors}
                          />
                        ))}
                        <CriterionBar
                          icon="albums"
                          label="Vocab retention"
                          current={progressInfo!.vocabCurrent}
                          target={progressInfo!.vocabTarget}
                          unit="%"
                          colors={colors}
                        />
                        <CriterionBar
                          icon="construct"
                          label="Open grammar gaps"
                          current={progressInfo!.grammarCurrent}
                          target={progressInfo!.grammarTarget}
                          unit=""
                          inverse
                          colors={colors}
                        />
                        <CriteriaRow icon="document-text" label="Min mock score" value={`${stage.exitCriteria.minMockAssessmentScore}`} colors={colors} />

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
                          <View
                            style={[
                              styles.resultBox,
                              decision.evaluation.passed && styles.resultPassed,
                              { backgroundColor: decision.evaluation.passed ? colors.successSoft : colors.warningSoft },
                            ]}>
                            {decision.evaluation.passed ? (
                              <>
                                <CelebrationBadge color={colors.success} icon="checkmark-done" size={56} />
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: 'center' }]}>
                                  {decision.action === 'unlock_next_stage' ? 'Next stage unlocked!' : 'All criteria met!'}
                                </Text>
                              </>
                            ) : (
                              <>
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Not yet — keep going</Text>
                                {decision.evaluation.unmetCriteria.map((c, i) => (
                                  <Text key={i} style={{ color: colors.textSecondary, fontSize: 12.5 }}>
                                    • {c}
                                  </Text>
                                ))}
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </Card>
                </Pressable>
              )}
            </FadeInView>
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

/** One exit-criterion as a current-vs-target bar, instead of just the bare threshold number. */
function CriterionBar({
  icon,
  label,
  current,
  target,
  unit,
  inverse = false,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  current: number;
  target: number;
  unit: string;
  inverse?: boolean;
  colors: ThemeColors;
}) {
  const met = inverse ? current <= target : current >= target;
  const percent = inverse
    ? current === 0
      ? 100
      : Math.max(0, Math.min(100, (target / Math.max(current, target, 1)) * 100))
    : target === 0
      ? 100
      : Math.min(100, (current / target) * 100);

  return (
    <View style={styles.criterionBar}>
      <View style={styles.criterionBarHeader}>
        <Ionicons name={icon} size={13} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, flex: 1, fontSize: 12.5 }}>{label}</Text>
        <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={met ? colors.success : colors.textSecondary} />
        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.semibold, fontSize: 12.5 }}>
          {current}
          {unit} / {target}
          {unit}
        </Text>
      </View>
      <AnimatedProgressBar value={percent} color={met ? colors.success : colors.danger} trackColor={colors.surfaceAlt} height={5} />
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
  resultBox: { marginTop: spacing.md, gap: 4, padding: spacing.md, borderRadius: 12 },
  resultPassed: { alignItems: 'center' },
  lockedBand: { fontFamily: fontFamily.regular, fontSize: 12.5, marginTop: 2 },
  criterionBar: { gap: 4 },
  criterionBarHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'transparent' },
  error: { fontFamily: fontFamily.medium },
});
