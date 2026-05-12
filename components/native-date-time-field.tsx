import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AquariumTheme } from '@/constants/aquarium-theme';

type PickerMode = 'date' | 'time';

type NativeDateTimeFieldProps = {
  value: Date;
  onChange: (value: Date) => void;
  onSetNow: () => void;
};

function formatDate(value: Date) {
  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: Date) {
  return value.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function NativeDateTimeField({ value, onChange, onSetNow }: NativeDateTimeFieldProps) {
  const [activeMode, setActiveMode] = useState<PickerMode | null>(null);

  function updateValue(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== 'ios') {
      setActiveMode(null);
    }

    if (selectedDate) {
      onChange(selectedDate);
    }
  }

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Test date and time</Text>
        <Pressable style={styles.smallButton} onPress={onSetNow}>
          <Text style={styles.smallButtonText}>Now</Text>
        </Pressable>
      </View>

      <View style={styles.dateRow}>
        <Pressable style={[styles.pickerButton, styles.dateButton]} onPress={() => setActiveMode('date')}>
          <Text style={styles.pickerLabel}>Date</Text>
          <Text style={styles.pickerValue}>{formatDate(value)}</Text>
        </Pressable>
        <Pressable style={[styles.pickerButton, styles.timeButton]} onPress={() => setActiveMode('time')}>
          <Text style={styles.pickerLabel}>Time</Text>
          <Text style={styles.pickerValue}>{formatTime(value)}</Text>
        </Pressable>
      </View>

      {activeMode ? (
        <View style={Platform.OS === 'ios' ? styles.iosPickerPanel : null}>
          <DateTimePicker
            value={value}
            mode={activeMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={updateValue}
          />
          {Platform.OS === 'ios' ? (
            <Pressable style={styles.doneButton} onPress={() => setActiveMode(null)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  label: {
    color: AquariumTheme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerButton: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateButton: {
    flex: 1,
  },
  timeButton: {
    width: 128,
  },
  pickerLabel: {
    color: AquariumTheme.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  pickerValue: {
    color: AquariumTheme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  smallButton: {
    backgroundColor: AquariumTheme.surfaceMint,
    borderColor: AquariumTheme.borderMint,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  smallButtonText: {
    color: AquariumTheme.teal,
    fontSize: 13,
    fontWeight: '800',
  },
  iosPickerPanel: {
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  doneButton: {
    alignItems: 'center',
    borderTopColor: AquariumTheme.borderSoft,
    borderTopWidth: 1,
    padding: 12,
  },
  doneButtonText: {
    color: AquariumTheme.primary,
    fontSize: 16,
    fontWeight: '800',
  },
});
