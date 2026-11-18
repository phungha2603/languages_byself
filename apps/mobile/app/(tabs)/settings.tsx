import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import type { IeltsBandStage } from '@app/shared-types';

import { Text, View } from '@/components/Themed';
import { useApp } from '@/src/state/AppContext';
import { useGoogleSignIn } from '@/src/auth/useGoogleSignIn';
import { notify } from '@/src/utils/notify';

export default function SettingsScreen() {
  const { api, apiBaseUrl, setApiBaseUrl, userId, login, logout, stageId } = useApp();
  const [urlInput, setUrlInput] = useState(apiBaseUrl);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [targetBand, setTargetBand] = useState('6.5');
  const [stages, setStages] = useState<IeltsBandStage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  async function handleCreateProfile() {
    if (!email || !displayName) {
      notify('Missing info', 'Email and display name are required.');
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const auth = await api.createUser(email.trim(), displayName.trim(), Number(targetBand) || undefined, selectedStageId ?? undefined);
      await login(auth);
      notify('Profile created', `Welcome, ${auth.user.displayName}!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create profile';
      setErrorMessage(message);
      notify('Error', message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {errorMessage && <Text style={styles.errorBanner}>{errorMessage}</Text>}
      <Text style={styles.title}>Backend connection</Text>
      <Text style={styles.label}>API base URL</Text>
      <TextInput
        style={styles.input}
        value={urlInput}
        onChangeText={setUrlInput}
        placeholder="http://localhost:3000/api"
        autoCapitalize="none"
      />
      <Pressable style={styles.button} onPress={handleSaveUrl}>
        <Text style={styles.buttonText}>Save URL</Text>
      </Pressable>

      <View style={styles.divider} />

      {userId ? (
        <>
          <Text style={styles.title}>Your profile</Text>
          <Text>User ID: {userId}</Text>
          <Text>Current stage: {stageId}</Text>
          <Pressable style={[styles.button, styles.dangerButton]} onPress={logout}>
            <Text style={styles.buttonText}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>Starting IELTS stage</Text>
          <Text style={styles.hint}>
            Chọn mốc gần nhất với trình độ hiện tại của bạn — các mốc trước đó sẽ được đánh dấu đã hoàn thành.
          </Text>
          {stages.map((stage) => (
            <Pressable
              key={stage.id}
              style={[styles.stageOption, selectedStageId === stage.id && styles.stageOptionSelected]}
              onPress={() => setSelectedStageId(stage.id)}>
              <Text style={[styles.stageOptionText, selectedStageId === stage.id && styles.stageOptionTextSelected]}>
                {selectedStageId === stage.id ? '◉ ' : '○ '}
                {stage.label}
              </Text>
            </Pressable>
          ))}

          <Text style={styles.title}>Sign in with Google</Text>
          {!google.configured && (
            <Text style={styles.hint}>
              Chưa cấu hình EXPO_PUBLIC_GOOGLE_*_CLIENT_ID — xem docs/ARCHITECTURE.md để thiết lập OAuth Client thật trên Google
              Cloud Console trước khi dùng nút này.
            </Text>
          )}
          <Pressable
            style={[styles.button, styles.googleButton]}
            disabled={busy || !google.request}
            onPress={() => google.promptAsync()}>
            <Text style={styles.buttonText}>{busy ? 'Signing in…' : 'Sign in with Google'}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Text style={styles.title}>Or create a profile manually</Text>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Text style={styles.label}>Display name</Text>
          <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />
          <Text style={styles.label}>Target IELTS band</Text>
          <TextInput style={styles.input} value={targetBand} onChangeText={setTargetBand} keyboardType="decimal-pad" />
          <Pressable style={styles.button} disabled={busy} onPress={handleCreateProfile}>
            <Text style={styles.buttonText}>{busy ? 'Creating…' : 'Create profile'}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  label: { marginTop: 8, opacity: 0.7 },
  hint: { opacity: 0.5, fontSize: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#00000030', borderRadius: 8, padding: 10 },
  button: { marginTop: 12, backgroundColor: '#2e7d32', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  googleButton: { backgroundColor: '#1a73e8' },
  dangerButton: { backgroundColor: '#c62828' },
  buttonText: { color: 'white', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#00000015', marginVertical: 16 },
  stageOption: { borderWidth: 1, borderColor: '#00000020', borderRadius: 8, padding: 10, marginTop: 6 },
  stageOptionSelected: { borderColor: '#2e7d32', backgroundColor: '#2e7d3215' },
  stageOptionText: { opacity: 0.8 },
  stageOptionTextSelected: { opacity: 1, fontWeight: '600' },
  errorBanner: { backgroundColor: '#c6282820', color: '#c62828', padding: 10, borderRadius: 8 },
});
