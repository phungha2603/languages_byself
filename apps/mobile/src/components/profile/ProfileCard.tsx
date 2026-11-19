import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CEFR_LEVEL_BY_STAGE, type CefrLevel, type User, type VocabLevelProgress } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Button, Card } from '@/src/components/ui';
import { useApp } from '@/src/state/AppContext';
import { fontFamily, radii, spacing, useTheme } from '@/src/theme';
import { vocabLevelColors } from '@/src/theme/vocabLevelColors';
import { profileThemeFor } from '@/src/utils/avatar';
import { notify } from '@/src/utils/notify';

type EditField = 'displayName' | 'status' | null;

export function ProfileCard() {
  const { api, userId, stageId, logout } = useApp();
  const { colors } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<VocabLevelProgress[]>([]);
  const [editingField, setEditingField] = useState<EditField>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!userId) return;
    api.getUser(userId).then(setUser).catch(() => {});
    api.getVocabLevelProgress(userId).then(setProgress).catch(() => {});
  }, [api, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!userId) return null;
  if (!user) {
    return (
      <Card style={styles.loadingCard}>
        <ActivityIndicator color={colors.primary} />
      </Card>
    );
  }

  const theme = profileThemeFor(userId);
  const level = (CEFR_LEVEL_BY_STAGE[stageId] ?? 'A1') as CefrLevel;
  const levelColor = vocabLevelColors[level];
  const totalMastered = progress.reduce((sum, p) => sum + p.masteredWords, 0);
  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  function startEdit(field: Exclude<EditField, null>) {
    setDraft(field === 'displayName' ? user!.displayName : (user!.status ?? ''));
    setEditingField(field);
  }

  async function saveEdit() {
    if (!editingField || !userId) return;
    const trimmed = draft.trim();
    if (editingField === 'displayName' && !trimmed) {
      notify('Name required', 'Display name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateProfile(userId, { [editingField]: trimmed });
      setUser(updated);
      setEditingField(null);
    } catch (err) {
      notify('Could not save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padded={false} style={styles.card}>
      <LinearGradient colors={theme.gradient} style={styles.banner}>
        <View style={[styles.decorCircleLg, { backgroundColor: '#FFFFFF1A' }]} />
        <View style={[styles.decorCircleSm, { backgroundColor: '#FFFFFF26' }]} />
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.avatarRing, { borderColor: colors.surface, backgroundColor: theme.gradient[0] }]}>
          <Text style={styles.avatarEmoji}>{theme.emoji}</Text>
        </View>

        <View style={styles.identityCol}>
          {editingField === 'displayName' ? (
            <EditRow value={draft} onChangeText={setDraft} onSave={saveEdit} onCancel={() => setEditingField(null)} saving={saving} />
          ) : (
            <Pressable onPress={() => startEdit('displayName')} style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{user.displayName}</Text>
              <Ionicons name="pencil" size={13} color={colors.textSecondary} />
            </Pressable>
          )}

          {editingField === 'status' ? (
            <EditRow
              value={draft}
              onChangeText={setDraft}
              onSave={saveEdit}
              onCancel={() => setEditingField(null)}
              saving={saving}
              placeholder="Add a status…"
            />
          ) : (
            <Pressable onPress={() => startEdit('status')}>
              <Text style={[styles.status, { color: user.status ? colors.textSecondary : colors.textSecondary }]} numberOfLines={2}>
                {user.status || 'Tap to add a status…'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.statsRow}>
          <StatTile icon="ribbon" label="Level" value={level} color={levelColor} />
          <StatTile icon="flag" label="Target" value={user.targetBand ? `Band ${user.targetBand}` : '—'} color={colors.primary} />
          <StatTile icon="book" label="Words" value={String(totalMastered)} color={colors.success} />
          <StatTile icon="calendar" label="Joined" value={memberSince} color={colors.info} />
        </View>

        <Button label="Sign out" icon="log-out-outline" variant="outline" color={colors.danger} onPress={logout} fullWidth />
      </View>
    </Card>
  );
}

function EditRow({
  value,
  onChangeText,
  onSave,
  onCancel,
  saving,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.editRow}>
      <TextInput
        style={[styles.editInput, { borderColor: colors.primary, color: colors.textPrimary, backgroundColor: colors.surfaceAlt }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoFocus
        maxLength={140}
      />
      <Pressable onPress={onSave} disabled={saving} style={[styles.editIconBtn, { backgroundColor: colors.success }]}>
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={16} color="#fff" />}
      </Pressable>
      <Pressable onPress={onCancel} disabled={saving} style={[styles.editIconBtn, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="close" size={16} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

function StatTile({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIconDot, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingCard: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  card: { overflow: 'hidden' },
  banner: { height: 92, overflow: 'hidden' },
  decorCircleLg: { position: 'absolute', width: 140, height: 140, borderRadius: 70, top: -60, right: -30 },
  decorCircleSm: { position: 'absolute', width: 70, height: 70, borderRadius: 35, bottom: -30, left: 40 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -36,
  },
  avatarEmoji: { fontSize: 32 },
  identityCol: { gap: 2, backgroundColor: 'transparent' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'transparent' },
  name: { fontFamily: fontFamily.display, fontSize: 19 },
  status: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'transparent' },
  editInput: { flex: 1, borderWidth: 1.5, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, fontFamily: fontFamily.regular, fontSize: 14 },
  editIconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' },
  statTile: { alignItems: 'center', gap: 4, flex: 1, backgroundColor: 'transparent' },
  statIconDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fontFamily.semibold, fontSize: 13 },
  statLabel: { fontFamily: fontFamily.regular, fontSize: 10.5 },
});
