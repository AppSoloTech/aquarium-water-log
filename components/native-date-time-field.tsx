import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { useTheme } from '@/theme';

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
  return value.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function NativeDateTimeField({ value, onChange, onSetNow }: NativeDateTimeFieldProps) {
  const theme = useTheme();
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
    <View style={[styles.field, { gap: theme.spacing.sm }]}>
      <View style={[styles.labelRow, { gap: theme.spacing.md }]}>
        <Text style={[theme.typography.label, { color: theme.colors.text }]}>Test date and time</Text>
        <Button
          label="Now"
          size="sm"
          variant="ghost"
          leftIcon="clock"
          onPress={onSetNow}
          accessibilityLabel="Set test time to now"
        />
      </View>

      <View style={[styles.dateRow, { gap: theme.spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change test date, currently ${formatDate(value)}`}
          onPress={() => setActiveMode('date')}
          style={({ pressed }) => [
            styles.pickerButton,
            styles.dateButton,
            {
              backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
            },
          ]}>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Date</Text>
          <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>{formatDate(value)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change test time, currently ${formatTime(value)}`}
          onPress={() => setActiveMode('time')}
          style={({ pressed }) => [
            styles.pickerButton,
            styles.timeButton,
            {
              backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.md,
            },
          ]}>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Time</Text>
          <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>{formatTime(value)}</Text>
        </Pressable>
      </View>

      {activeMode ? (
        <View
          style={
            Platform.OS === 'ios'
              ? [
                  styles.iosPickerPanel,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                  },
                ]
              : null
          }>
          <DateTimePicker
            value={value}
            mode={activeMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={updateValue}
          />
          {Platform.OS === 'ios' ? (
            <View style={{ padding: theme.spacing.md, borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth }}>
              <Button label="Done" variant="ghost" onPress={() => setActiveMode(null)} fullWidth />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {},
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateRow: { flexDirection: 'row' },
  pickerButton: { borderWidth: 1, gap: 2, minHeight: 58 },
  dateButton: { flex: 1 },
  timeButton: { width: 128 },
  iosPickerPanel: { borderWidth: 1, overflow: 'hidden' },
});
