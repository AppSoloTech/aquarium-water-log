import { StyleSheet, Switch, Text, View } from 'react-native';

import { NativeDateTimeField } from '@/components/native-date-time-field';
import { QuickValueRow } from '@/components/quick-value-row';
import { TankDropdown } from '@/components/tank-dropdown';
import { Button, Card, TextField } from '@/components/ui';
import type { Tank } from '@/lib/database';
import { numberFields, type NumberField, type NumberInputs } from '@/lib/water-test-form';
import { useTheme } from '@/theme';

export type WaterTestFormState = {
  selectedTankId: number | null;
  testedAt: Date;
  numbers: NumberInputs;
  notes: string;
  didWaterChange: boolean;
};

type WaterTestFormProps = {
  tanks: Tank[];
  state: WaterTestFormState;
  onChange: (next: Partial<WaterTestFormState>) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  onDiscard?: () => void;
  submitLabel: string;
  isSaving?: boolean;
};

/**
 * Shared form used by the Add Test tab and the Edit Test modal. Holds the
 * non-trivial layout (tank dropdown + native date/time + 5 numeric fields
 * with quick-value chips + water change toggle + notes + actions) so each
 * screen reduces to fetching/saving plus a thin state owner.
 */
export function WaterTestForm({
  tanks,
  state,
  onChange,
  onSubmit,
  onCancel,
  onDiscard,
  submitLabel,
  isSaving = false,
}: WaterTestFormProps) {
  const theme = useTheme();

  function updateNumber(key: NumberField, value: string) {
    onChange({ numbers: { ...state.numbers, [key]: value } });
  }

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <TankDropdown
        label="Tank"
        tanks={tanks}
        selectedTankId={state.selectedTankId}
        onSelect={(id) => onChange({ selectedTankId: id })}
      />

      <NativeDateTimeField
        value={state.testedAt}
        onChange={(value) => onChange({ testedAt: value })}
        onSetNow={() => onChange({ testedAt: new Date() })}
      />

      {numberFields.map((field) => (
        <View key={field.key} style={{ gap: theme.spacing.sm }}>
          <TextField
            label={field.label}
            value={state.numbers[field.key]}
            onChangeText={(value) => updateNumber(field.key, value)}
            placeholder={field.placeholder}
            inputMode="decimal"
            keyboardType="decimal-pad"
            accessibilityLabel={`${field.label} value in parts per million`}
            inputStyle={{ fontVariant: ['tabular-nums'] }}
          />
          <QuickValueRow
            values={field.quickValues}
            onSelect={(value) => updateNumber(field.key, value)}
            fieldLabel={field.label}
          />
        </View>
      ))}

      <Card variant="muted" padding="md" elevation="none">
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>
              Water change performed
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              Mark this if you changed water with this test.
            </Text>
          </View>
          <Switch
            value={state.didWaterChange}
            onValueChange={(value) => onChange({ didWaterChange: value })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
            accessibilityLabel="Water change performed"
            accessibilityHint="Mark if you changed water at the time of this test"
          />
        </View>
      </Card>

      <TextField
        label="Notes"
        value={state.notes}
        onChangeText={(value) => onChange({ notes: value })}
        placeholder="Optional notes"
        multiline
      />

      <View style={[styles.actions, { gap: theme.spacing.sm }]}>
        <Button
          label={isSaving ? 'Saving...' : submitLabel}
          onPress={onSubmit}
          loading={isSaving}
          haptic="medium"
          fullWidth
          style={styles.flex1}
          leftIcon="checkmark.circle.fill"
        />
        {onCancel ? (
          <Button label="Cancel" variant="ghost" onPress={onCancel} fullWidth style={styles.flex1} haptic="none" />
        ) : null}
      </View>
      {onDiscard ? (
        <Button
          label="Discard Draft"
          variant="ghost"
          onPress={onDiscard}
          fullWidth
          haptic="warning"
          accessibilityHint="Clears the unsaved test values"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  switchLabel: { flexShrink: 1, gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  flex1: { flex: 1 },
});
