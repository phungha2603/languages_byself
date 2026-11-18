import { StyleSheet, View as RNView } from 'react-native';
import { Text, View } from '@/components/Themed';

export function MasteryBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped >= 70 ? '#2e7d32' : clamped >= 40 ? '#f9a825' : '#c62828';

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <RNView style={styles.track}>
        <RNView style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
      </RNView>
      <Text style={styles.value}>{clamped}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 6, gap: 8 },
  label: { width: 80, textTransform: 'capitalize' },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#e0e0e0', overflow: 'hidden' },
  fill: { height: '100%' },
  value: { width: 44, textAlign: 'right' },
});
