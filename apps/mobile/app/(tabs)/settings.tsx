import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { IeltsBandStage } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { Button, Card, ScreenHeader } from '@/src/components/ui';
import { ProfileCard } from '@/src/components/profile/ProfileCard';
import { useApp } from '@/src/state/AppContext';
import { useGoogleSignIn } from '@/src/auth/useGoogleSignIn';
import { notify } from '@/src/utils/notify';
import { fontFamily, spacing, useTheme } from '@/src/theme';

export default function SettingsScreen() {
  const { api, apiBaseUrl, setApiBaseUrl, userId, login } = useApp();
  const { colors } = useTheme();
  const [urlInput, setUrlInput] = useState(apiBaseUrl);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [targetBand, setTargetBand] = useState('6.5');
  const [stages, setStages] = useState<IeltsBandStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const google = useGoogleSignIn();

  useEffect(() => {
    api
      .listStages()
      .then((list) => {
        setStages(list);
        setSelectedStageId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    if (!google.idToken) return;
    (async () => {
      setBusy(true);
      setErrorMessage(null);
      try {
        const auth = await api.loginWithGoogle(google.idToken!, selectedStageId ?? undefined);
        await login(auth);
        notify('Signed in', `Welcome, ${auth.user.displayName}!`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setErrorMessage(message);
        notify('Google sign-in failed', message);
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [google.idToken]);

  async function handleSaveUrl() {
    await setApiBaseUrl(urlInput.trim());
    notify('Saved', 'API base URL updated.');
  }

  async function handleLogin() {
    if (!email || !password) {
      notify('Thiếu thông tin', 'Nhập email và mật khẩu.');
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const auth = await api.login(email.trim(), password);
      await login(auth);
      notify('Đã đăng nhập', `Chào mừng trở lại, ${auth.user.displayName}!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đăng nhập thất bại';
      setErrorMessage(message);
      notify('Lỗi đăng nhập', message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    if (!email || !password || !displayName) {
      notify('Thiếu thông tin', 'Email, mật khẩu và tên hiển thị là bắt buộc.');
      return;
    }
    if (password.length < 8) {
      notify('Mật khẩu quá ngắn', 'Mật khẩu cần ít nhất 8 ký tự.');
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const auth = await api.createUser(
        email.trim(),
        password,
        displayName.trim(),
        Number(targetBand) || undefined,
        selectedStageId ?? undefined,
      );
      await login(auth);
      notify('Đã tạo tài khoản', `Chào mừng, ${auth.user.displayName}!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tạo tài khoản';
      setErrorMessage(message);
      notify('Lỗi', message);
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surfaceAlt }];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <ScreenHeader title="Settings" subtitle="Account, server connection & study plan" />

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg, backgroundColor: 'transparent' }}>
        {errorMessage && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={{ color: colors.danger, flex: 1 }}>{errorMessage}</Text>
          </View>
        )}

        {userId ? (
          <ProfileCard />
        ) : (
          <>
            <Card style={{ gap: spacing.sm }}>
              <SectionLabel icon="flag" text="Starting IELTS stage" color={colors.primary} />
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Chọn mốc gần nhất với trình độ hiện tại của bạn — các mốc trước đó sẽ được đánh dấu đã hoàn thành.
              </Text>
              {stages.map((stage) => {
                const selected = selectedStageId === stage.id;
                return (
                  <Pressable key={stage.id} onPress={() => setSelectedStageId(stage.id)}>
                    <View
                      style={[
                        styles.stageOption,
                        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : 'transparent' },
                      ]}>
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                      <Text style={[styles.stageOptionText, { color: selected ? colors.primary : colors.textPrimary }]}>{stage.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </Card>

            <Card style={{ gap: spacing.sm }}>
              <SectionLabel icon="log-in" text="Sign in with Google" color="#1a73e8" />
              {!google.configured && (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Chưa cấu hình EXPO_PUBLIC_GOOGLE_*_CLIENT_ID — xem docs/ARCHITECTURE.md để thiết lập OAuth Client thật trên Google
                  Cloud Console trước khi dùng nút này.
                </Text>
              )}
              <Pressable
                disabled={busy || !google.request}
                onPress={() => google.promptAsync()}
                style={({ pressed }) => [
                  styles.googleButton,
                  { borderColor: colors.border, opacity: busy || !google.request ? 0.5 : pressed ? 0.85 : 1 },
                ]}>
                <Ionicons name="logo-google" size={18} color="#1a73e8" />
                <Text style={[styles.googleButtonText, { color: colors.textPrimary }]}>
                  {busy ? 'Signing in…' : 'Sign in with Google'}
                </Text>
              </Pressable>
            </Card>

            <Card style={{ gap: spacing.sm }}>
              <SectionLabel icon="mail" text="Email & mật khẩu" color={colors.primary} />

              <View style={[styles.modeToggle, { borderColor: colors.border }]}>
                <Pressable style={styles.modeOption} onPress={() => setAuthMode('login')}>
                  <View
                    style={[
                      styles.modeOptionInner,
                      { backgroundColor: authMode === 'login' ? colors.primary : 'transparent' },
                    ]}>
                    <Text style={[styles.modeOptionText, { color: authMode === 'login' ? '#fff' : colors.textSecondary }]}>
                      Đăng nhập
                    </Text>
                  </View>
                </Pressable>
                <Pressable style={styles.modeOption} onPress={() => setAuthMode('register')}>
                  <View
                    style={[
                      styles.modeOptionInner,
                      { backgroundColor: authMode === 'register' ? colors.primary : 'transparent' },
                    ]}>
                    <Text style={[styles.modeOptionText, { color: authMode === 'register' ? '#fff' : colors.textSecondary }]}>
                      Đăng ký
                    </Text>
                  </View>
                </Pressable>
              </View>

              <Field label="Email">
                <TextInput
                  style={inputStyle}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor={colors.textSecondary}
                />
              </Field>
              <Field label="Mật khẩu">
                <TextInput
                  style={inputStyle}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholderTextColor={colors.textSecondary}
                />
              </Field>

              {authMode === 'register' && (
                <>
                  <Field label="Tên hiển thị">
                    <TextInput style={inputStyle} value={displayName} onChangeText={setDisplayName} placeholderTextColor={colors.textSecondary} />
                  </Field>
                  <Field label="Mục tiêu band IELTS">
                    <TextInput style={inputStyle} value={targetBand} onChangeText={setTargetBand} keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
                  </Field>
                </>
              )}

              {authMode === 'login' ? (
                <Button label={busy ? 'Đang đăng nhập…' : 'Đăng nhập'} icon="log-in" loading={busy} onPress={handleLogin} fullWidth />
              ) : (
                <Button label={busy ? 'Đang tạo…' : 'Tạo tài khoản'} icon="checkmark" loading={busy} onPress={handleRegister} fullWidth />
              )}
            </Card>
          </>
        )}

        <Pressable onPress={() => setShowAdvanced((v) => !v)} style={styles.advancedToggle}>
          <Ionicons name={showAdvanced ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.textSecondary} />
          <Text style={[styles.advancedToggleText, { color: colors.textSecondary }]}>Advanced</Text>
        </Pressable>

        {showAdvanced && (
          <Card style={{ gap: spacing.sm }}>
            <SectionLabel icon="server" text="Backend connection" color={colors.textSecondary} />
            <Field label="API base URL">
              <TextInput
                style={inputStyle}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="http://localhost:3000/api"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
            </Field>
            <Button label="Save URL" icon="save-outline" variant="soft" onPress={handleSaveUrl} fullWidth />
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function SectionLabel({ icon, text, color }: { icon: keyof typeof Ionicons.glyphMap; text: string; color: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.cardTitle, { color }]}>{text}</Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4, backgroundColor: 'transparent' }}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxxl },
  advancedToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', padding: spacing.xs },
  advancedToggleText: { fontFamily: fontFamily.medium, fontSize: 12.5 },
  cardTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'transparent' },
  hint: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  fieldLabel: { fontFamily: fontFamily.medium, fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 10, fontFamily: fontFamily.regular },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12 },
  stageOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderRadius: 12, padding: spacing.sm },
  stageOptionText: { fontFamily: fontFamily.medium, fontSize: 13.5, flex: 1 },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 12,
  },
  googleButtonText: { fontFamily: fontFamily.semibold, fontSize: 15 },
  modeToggle: { flexDirection: 'row', borderWidth: 1.5, borderRadius: 999, padding: 3, gap: 3 },
  modeOption: { flex: 1 },
  modeOptionInner: { borderRadius: 999, paddingVertical: 8, alignItems: 'center' },
  modeOptionText: { fontFamily: fontFamily.semibold, fontSize: 13.5 },
});
