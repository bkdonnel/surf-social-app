import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHomeSpots, type HomeSpotWithLocation } from '@/hooks/use-home-spots';
import { useSpots } from '@/hooks/use-spots';
import { fetchMarineForecast, type MarineForecastHour } from '@/lib/forecast';

type ForecastDayGroup = { label: string; hours: MarineForecastHour[] };

function groupByDay(hours: MarineForecastHour[]): ForecastDayGroup[] {
  const groups: ForecastDayGroup[] = [];
  for (const hour of hours) {
    const label = new Date(hour.time).toLocaleDateString([], { weekday: 'short' });
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.hours.push(hour);
    } else {
      groups.push({ label, hours: [hour] });
    }
  }
  return groups;
}

const LABEL_COLUMN_WIDTH = 64;
const LABEL_COLUMN_GAP = 8;
const METERS_TO_FEET = 3.28084;

function ForecastSummary({ spot }: { spot: HomeSpotWithLocation }) {
  const [hours, setHours] = useState<MarineForecastHour[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDayLabel, setActiveDayLabel] = useState('');
  const dayOffsets = useRef<{ label: string; x: number }[]>([]);

  useEffect(() => {
    fetchMarineForecast(spot.latitude, spot.longitude, 3)
      .then((result) => {
        const currentHourStart = new Date();
        currentHourStart.setMinutes(0, 0, 0);
        const upcoming = result.filter((hour) => new Date(hour.time) >= currentHourStart);
        dayOffsets.current = [];
        setHours(upcoming);
        setActiveDayLabel(groupByDay(upcoming)[0]?.label ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load forecast'));
  }, [spot.latitude, spot.longitude]);

  if (error) return <ThemedText style={styles.error}>{error}</ThemedText>;
  if (!hours) return <ThemedText type="small">Loading forecast…</ThemedText>;

  function recordDayOffset(label: string, event: LayoutChangeEvent) {
    const x = event.nativeEvent.layout.x;
    const offsets = dayOffsets.current;
    const existing = offsets.find((o) => o.label === label);
    if (existing) {
      existing.x = x;
    } else {
      offsets.push({ label, x });
    }
    offsets.sort((a, b) => a.x - b.x);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const scrollX = event.nativeEvent.contentOffset.x;
    const offsets = dayOffsets.current;
    let current = offsets[0]?.label ?? '';
    for (const offset of offsets) {
      if (offset.x <= scrollX + 1) current = offset.label;
      else break;
    }
    setActiveDayLabel(current);
  }

  return (
    <ThemedView>
      <ThemedText
        type="smallBold"
        style={[styles.dayLabel, { marginLeft: LABEL_COLUMN_WIDTH + LABEL_COLUMN_GAP }]}>
        {activeDayLabel}
      </ThemedText>

      <ThemedView style={styles.forecastGrid}>
        <ThemedView style={[styles.gridLabelColumn, { width: LABEL_COLUMN_WIDTH, marginRight: LABEL_COLUMN_GAP }]}>
          <ThemedView style={styles.gridLabelCell}>
            <ThemedText type="small" style={styles.fieldLabel}>
              Time
            </ThemedText>
            <ThemedText type="small" style={styles.fieldLabel}>
              Height
            </ThemedText>
            <ThemedText type="small" style={styles.fieldLabel}>
              Period
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysRow}
          onScroll={handleScroll}
          scrollEventThrottle={16}>
          {groupByDay(hours).map((day) => (
            <ThemedView
              key={day.hours[0].time}
              onLayout={(event) => recordDayOffset(day.label, event)}
              style={styles.hourRow}>
              {day.hours.map((hour) => {
                const date = new Date(hour.time);
                return (
                  <ThemedView key={hour.time} type="background" style={styles.hourCell}>
                    <ThemedText type="small">{date.toLocaleTimeString([], { hour: 'numeric' })}</ThemedText>
                    <ThemedText type="smallBold">
                      {hour.waveHeightM !== null ? `${(hour.waveHeightM * METERS_TO_FEET).toFixed(1)}ft` : '—'}
                    </ThemedText>
                    <ThemedText type="small">
                      {hour.wavePeriodS !== null ? `${hour.wavePeriodS.toFixed(0)}s` : '—'}
                    </ThemedText>
                  </ThemedView>
                );
              })}
            </ThemedView>
          ))}
        </ScrollView>
      </ThemedView>
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
          Wave height / period, next 3 days
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
  forecastGrid: { flexDirection: 'row' },
  gridLabelColumn: {},
  gridLabelCell: { padding: 8 },
  fieldLabel: { opacity: 0.6, textAlign: 'right' },
  daysRow: { flexDirection: 'row', gap: 16 },
  hourRow: { flexDirection: 'row', gap: 8 },
  hourCell: { alignItems: 'center', padding: 8, borderRadius: 8, minWidth: 56 },
  dayLabel: { opacity: 0.6, marginBottom: 4 },
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
