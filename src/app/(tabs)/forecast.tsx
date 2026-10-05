import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHomeSpots, type HomeSpotWithLocation } from '@/hooks/use-home-spots';
import { useSpots } from '@/hooks/use-spots';
import { fetchMarineForecast, type MarineForecastHour } from '@/lib/forecast';

function ForecastSummary({ spot }: { spot: HomeSpotWithLocation }) {
  const [hours, setHours] = useState<MarineForecastHour[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarineForecast(spot.latitude, spot.longitude, 2)
      .then((result) => setHours(result.slice(0, 6)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load forecast'));
  }, [spot.latitude, spot.longitude]);

  if (error) return <ThemedText style={styles.error}>{error}</ThemedText>;
  if (!hours) return <ThemedText type="small">Loading forecast…</ThemedText>;

  return (
    <ThemedView style={styles.hourRow}>
      {hours.map((hour) => (
        <ThemedView key={hour.time} type="background" style={styles.hourCell}>
          <ThemedText type="small">
            {new Date(hour.time).toLocaleTimeString([], { hour: 'numeric' })}
          </ThemedText>
          <ThemedText type="smallBold">
            {hour.waveHeightM !== null ? `${hour.waveHeightM.toFixed(1)}m` : '—'}
          </ThemedText>
          <ThemedText type="small">
            {hour.wavePeriodS !== null ? `${hour.wavePeriodS.toFixed(0)}s` : '—'}
          </ThemedText>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

export default function ForecastScreen() {
  const { homeSpots, loading, addHomeSpot, removeHomeSpot } = useHomeSpots();
  const { spots } = useSpots();
  const [showPicker, setShowPicker] = useState(false);

  const homedKeys = new Set(homeSpots.map((h) => h.spotKey));
  const addableSpots = spots.filter((s) => !homedKeys.has(s.key));

  function renderItem({ item }: { item: HomeSpotWithLocation }) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedView style={styles.cardHeader}>
          <ThemedText type="smallBold">{item.name}</ThemedText>
          <TouchableOpacity onPress={() => removeHomeSpot(item.id)}>
            <ThemedText type="link">Remove</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <ThemedText type="small" style={styles.caption}>
          Wave height / period, next few hours
        </ThemedText>
        <ForecastSummary spot={item} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={homeSpots}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          ListEmptyComponent={
            !loading ? (
              <ThemedText style={styles.empty}>
                No home spots yet. Add one to track its forecast.
              </ThemedText>
            ) : null
          }
        />

        {showPicker ? (
          <ThemedView type="backgroundElement" style={styles.form}>
            <ThemedText type="smallBold">Add a home spot</ThemedText>
            <FlatList
              data={addableSpots}
              keyExtractor={(item) => item.key}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={async () => {
                    await addHomeSpot(item.key);
                    setShowPicker(false);
                  }}>
                  <ThemedText>{item.name}</ThemedText>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <ThemedText type="link" style={styles.cancel}>
                Close
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => setShowPicker(true)}>
            <ThemedText style={styles.buttonText}>+ Add home spot</ThemedText>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 16, gap: 12 },
  listContent: { gap: 12, paddingVertical: 12 },
  card: { padding: 12, borderRadius: 10, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { opacity: 0.7 },
  hourRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  hourCell: { alignItems: 'center', padding: 8, borderRadius: 8, minWidth: 56 },
  empty: { textAlign: 'center', marginTop: 24 },
  error: { color: '#d33' },
  form: { padding: 12, borderRadius: 10, gap: 8, maxHeight: 280 },
  pickerList: { marginBottom: 4 },
  pickerRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  cancel: { textAlign: 'center' },
});
