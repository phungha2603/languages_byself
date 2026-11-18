import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useApp } from '@/src/state/AppContext';

export default function SettingsScreen() {
  const { api, apiBaseUrl, setApiBaseUrl, userId, setUserId, stageId } = useApp();
  const [urlInput, setUrlInput] = useState(apiBaseUrl);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [targetBand, setTargetBand] = useState('6.5');
  const [busy, setBusy] = useState(false);

  async function handleSaveUrl() {
    await setApiBaseUrl(urlInput.trim());
    Alert.alert('Saved', 'API base URL updated.');
  }

  async function handleCreateProfile() {
    if (!email || !displayName) {
      Alert.alert('Missing info', 'Email and display name are required.');
      return;
    }
    setBusy(true);
    try {
      const user = await api.createUser(email.trim(), displayName.trim(), Number(targetBand) || undefined);
      await setUserId(user.id);
      Alert.alert('Profile created', `Welcome, ${user.displayName}!`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create profile');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await setUserId(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
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
          <Pressable style={[styles.button, styles.dangerButton]} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Sign out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.title}>Create your profile</Text>
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
  input: { borderWidth: 1, borderColor: '#00000030', borderRadius: 8, padding: 10 },
  button: { marginTop: 12, backgroundColor: '#2e7d32', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  dangerButton: { backgroundColor: '#c62828' },
  buttonText: { color: 'white', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#00000015', marginVertical: 16 },
});
