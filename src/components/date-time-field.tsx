import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';

function formatDateTime(date: Date) {
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
}) {
  const [showIOSPicker, setShowIOSPicker] = useState(false);

  if (Platform.OS === 'web') {
    // @react-native-community/datetimepicker has no reliable web support;
    // fall back to a plain text field for the web target.
    return (
      <TextInput
        style={styles.webInput}
        placeholder={label}
        defaultValue={value.toISOString().slice(0, 16)}
        onChangeText={(text) => {
          const parsed = new Date(text);
          if (!Number.isNaN(parsed.getTime())) onChange(parsed);
        }}
      />
    );
  }

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      onChange: (_event, selectedDate) => {
        if (!selectedDate) return;
        DateTimePickerAndroid.open({
          value: selectedDate,
          mode: 'time',
          onChange: (_timeEvent, selectedTime) => {
            if (selectedTime) onChange(selectedTime);
          },
        });
      },
    });
  }

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={() => (Platform.OS === 'android' ? openAndroidPicker() : setShowIOSPicker(true))}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText>{formatDateTime(value)}</ThemedText>
      </TouchableOpacity>

      {Platform.OS === 'ios' && showIOSPicker && (
        <>
          <DateTimePicker
            value={value}
            mode="datetime"
            display="inline"
            onChange={(_event, selectedDate) => {
              if (selectedDate) onChange(selectedDate);
            }}
          />
          <TouchableOpacity style={styles.doneButton} onPress={() => setShowIOSPicker(false)}>
            <ThemedText type="small">Done</ThemedText>
          </TouchableOpacity>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  webInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
