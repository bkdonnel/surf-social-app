import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/date-time-field';
import { StarRating } from '@/components/star-rating';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { useSessions, type SessionWithSpot } from '@/hooks/use-sessions';
import { useSpots } from '@/hooks/use-spots';

export default function LogScreen() {
  const { signOut } = useAuth();
  const { sessions, loading, error, addSession } = useSessions();
  const { spots } = useSpots();

  const [showForm, setShowForm] = useState(false);
  const [spotKey, setSpotKey] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(new Date());
  const [endedAt, setEndedAt] = useState(new Date());
  const [waveCount, setWaveCount] = useState('');
  const [rating, setRating] = useState(3);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleAdd() {
    if (!spotKey) {
      setFormError('Pick a spot.');
      return;
    }
    const count = parseInt(waveCount, 10);
    if (Number.isNaN(count) || count < 0) {
      setFormError('Wave count must be a non-negative number.');
      return;
    }
    if (endedAt < startedAt) {
      setFormError('Session end time must be after the start time.');
      return;
    }

    setFormError(null);
    const { error: addError } = await addSession({
      spotKey,
      startedAt,
      endedAt,
      waveCount: count,
      rating,
    });

    if (addError) {
      setFormError(addError);
      return;
    }
    setWaveCount('');
    setRating(3);
    setShowForm(false);
  }

  function renderItem({ item }: { item: SessionWithSpot }) {
    const minutes = Math.round(
      (new Date(item.ended_at).getTime() - new Date(item.started_at).getTime()) / 60000
    );
    return (
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText type="smallBold">{item.spotName}</ThemedText>
        <ThemedText type="small">
          {new Date(item.started_at).toLocaleDateString()} · {minutes} min · {item.wave_count} waves ·{' '}
          {item.rating}★
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {showForm ? (
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled">
            <ThemedView type="backgroundElement" style={styles.form}>
              <ThemedText type="smallBold">Log a session</ThemedText>

              <ThemedText type="small">Spot</ThemedText>
              <FlatList
                horizontal
                data={spots}
                keyExtractor={(item) => item.key}
                contentContainerStyle={styles.spotPicker}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.spotChip, spotKey === item.key && styles.spotChipSelected]}
                    onPress={() => setSpotKey(item.key)}>
                    <ThemedText
                      type="small"
                      style={spotKey === item.key ? styles.spotChipTextSelected : undefined}>
                      {item.name}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              />

              <DateTimeField label="Start" value={startedAt} onChange={setStartedAt} />
              <DateTimeField label="End" value={endedAt} onChange={setEndedAt} />

              <TextInput
                style={styles.input}
                placeholder="Wave count"
                keyboardType="number-pad"
                value={waveCount}
                onChangeText={setWaveCount}
              />

              <ThemedText type="small">Rating</ThemedText>
              <StarRating value={rating} onChange={setRating} />

              {formError && <ThemedText style={styles.error}>{formError}</ThemedText>}

              <TouchableOpacity style={styles.button} onPress={handleAdd}>
                <ThemedText style={styles.buttonText}>Save session</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <ThemedText type="link" style={styles.cancel}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ScrollView>
        ) : (
          <>
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              refreshing={loading}
              ListEmptyComponent={
                !loading ? <ThemedText style={styles.empty}>No sessions logged yet.</ThemedText> : null
              }
            />

            {error && <ThemedText style={styles.error}>{error}</ThemedText>}

            <TouchableOpacity style={styles.button} onPress={() => setShowForm(true)}>
              <ThemedText style={styles.buttonText}>+ Log a session</ThemedText>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={signOut}>
          <ThemedText type="link" style={styles.cancel}>
            Sign out
          </ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 16, gap: 12 },
  listContent: { gap: 8, paddingVertical: 12 },
  row: { padding: 12, borderRadius: 10, gap: 4 },
  empty: { textAlign: 'center', marginTop: 24 },
  error: { color: '#d33' },
  formScroll: { flex: 1 },
  formScrollContent: { paddingBottom: 12 },
  form: { padding: 12, borderRadius: 10, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  spotPicker: { gap: 8, paddingVertical: 4 },
  spotChip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  spotChipSelected: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  spotChipTextSelected: { color: '#fff' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  cancel: { textAlign: 'center' },
});
