import { useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSpots, type SpotOption } from '@/hooks/use-spots';

export default function SpotsScreen() {
  const { spots, loading, error, addCustomSpot } = useSpots();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  async function handleAdd() {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      setFormError('Latitude and longitude must be numbers.');
      return;
    }
    setFormError(null);
    const { error: addError } = await addCustomSpot(name.trim(), lat, lon);
    if (addError) {
      setFormError(addError);
      return;
    }
    setName('');
    setLatitude('');
    setLongitude('');
    setShowForm(false);
  }

  function renderItem({ item }: { item: SpotOption }) {
    return (
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText type="smallBold">{item.name}</ThemedText>
        <ThemedText type="small">
          {item.kind === 'spot' ? 'Shared spot' : 'Your custom spot'} ·{' '}
          {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={spots}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          ListEmptyComponent={
            !loading ? <ThemedText style={styles.empty}>No spots yet.</ThemedText> : null
          }
        />

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        {showForm ? (
          <ThemedView type="backgroundElement" style={styles.form}>
            <ThemedText type="smallBold">Add a custom location</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Name (optional)"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Latitude"
              keyboardType="numbers-and-punctuation"
              value={latitude}
              onChangeText={setLatitude}
            />
            <TextInput
              style={styles.input}
              placeholder="Longitude"
              keyboardType="numbers-and-punctuation"
              value={longitude}
              onChangeText={setLongitude}
            />
            {formError && <ThemedText style={styles.error}>{formError}</ThemedText>}
            <TouchableOpacity style={styles.button} onPress={handleAdd}>
              <ThemedText style={styles.buttonText}>Save spot</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <ThemedText type="link" style={styles.cancel}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => setShowForm(true)}>
            <ThemedText style={styles.buttonText}>+ Add custom location</ThemedText>
          </TouchableOpacity>
        )}

        <ThemedText type="small" style={styles.note}>
          Don&apos;t see a named spot you surf regularly? Shared spots are added by an admin — add
          it as a custom location for now.
        </ThemedText>
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
  form: { padding: 12, borderRadius: 10, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  cancel: { textAlign: 'center' },
  note: { textAlign: 'center', marginBottom: 8 },
});
