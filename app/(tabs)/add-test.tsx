import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { NativeDateTimeField } from '@/components/native-date-time-field';
import { QuickValueRow } from '@/components/quick-value-row';
import { TankDropdown } from '@/components/tank-dropdown';
import { AquariumTheme } from '@/constants/aquarium-theme';
import {
  getDefaultTankId,
  getTanks,
  insertWaterTest,
  setDefaultTankId,
  type NewWaterTest,
  type Tank,
} from '@/lib/database';
import {
  blankNumbers,
  numberFields,
  parseWaterTestNumbers,
  type NumberField,
} from '@/lib/water-test-form';

export default function AddTestScreen() {
  const router = useRouter();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null);
  const [testedAt, setTestedAt] = useState(new Date());
  const [numbers, setNumbers] = useState(blankNumbers);
  const [notes, setNotes] = useState('');
  const [didWaterChange, setDidWaterChange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadTanks = useCallback(async () => {
    const [savedTanks, defaultTankId] = await Promise.all([getTanks(), getDefaultTankId()]);

    setTanks(savedTanks);
    setSelectedTankId((current) =>
      current ?? defaultTankId ?? savedTanks[0]?.id ?? null,
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      setTestedAt(new Date());
      loadTanks();
    }, [loadTanks]),
  );

  function resetForm() {
    setTestedAt(new Date());
    setNumbers(blankNumbers());
    setNotes('');
    setDidWaterChange(false);
  }

  function updateNumberField(key: NumberField, value: string) {
    setNumbers((current) => ({ ...current, [key]: value }));
  }

  async function saveTest() {
    if (!selectedTankId) {
      Alert.alert('Choose a tank', 'Create or select a tank before saving this test.');
      return;
    }

    const parsedNumbers = parseWaterTestNumbers(numbers);

    const invalidField = numberFields.find((field) => Number.isNaN(parsedNumbers[field.key]));

    if (invalidField) {
      Alert.alert('Check this value', `${invalidField.label} must be a number if filled in.`);
      return;
    }

    const test: NewWaterTest = {
      tank_id: selectedTankId,
      tested_at: testedAt.toISOString(),
      nitrate_no3: parsedNumbers.nitrate_no3,
      nitrite_no2: parsedNumbers.nitrite_no2,
      ph: parsedNumbers.ph,
      kh: parsedNumbers.kh,
      gh: parsedNumbers.gh,
      did_water_change: didWaterChange ? 1 : 0,
      notes: notes.trim() || null,
    };

    try {
      setIsSaving(true);
      await setDefaultTankId(selectedTankId);
      await insertWaterTest(test);
      resetForm();
      router.push('/history' as never);
    } catch (error) {
      console.error(error);
      Alert.alert('Save failed', 'The water test could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Water Test</Text>

        {tanks.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Create a tank first</Text>
            <Text style={styles.helpText}>
              Tests are saved under a tank, so add your first tank before logging readings.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/tanks' as never)}>
              <Text style={styles.primaryButtonText}>Add Tank</Text>
            </Pressable>
          </View>
        ) : null}

        <TankDropdown
          label="Tank"
          tanks={tanks}
          selectedTankId={selectedTankId}
          onSelect={setSelectedTankId}
        />

        <NativeDateTimeField
          value={testedAt}
          onChange={setTestedAt}
          onSetNow={() => setTestedAt(new Date())}
        />

        {numberFields.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              inputMode="decimal"
              keyboardType="decimal-pad"
              style={styles.input}
              value={numbers[field.key]}
              onChangeText={(value) => updateNumberField(field.key, value)}
              placeholder={field.placeholder}
            />
            <QuickValueRow
              values={field.quickValues}
              onSelect={(value) => updateNumberField(field.key, value)}
            />
          </View>
        ))}

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Water change performed</Text>
            <Text style={styles.helpText}>Mark this if you changed water with this test.</Text>
          </View>
          <Switch value={didWaterChange} onValueChange={setDidWaterChange} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            multiline
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            textAlignVertical="top"
          />
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={saveTest} disabled={isSaving}>
            <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save Test'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={resetForm}>
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    backgroundColor: AquariumTheme.screen,
    flexGrow: 1,
    gap: 14,
    padding: 20,
    paddingTop: 64,
  },
  title: {
    color: AquariumTheme.primaryDark,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  emptyPanel: {
    backgroundColor: AquariumTheme.surfaceWarm,
    borderColor: '#fed7aa',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  emptyTitle: {
    color: AquariumTheme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    color: AquariumTheme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  helpText: {
    color: AquariumTheme.muted,
    fontSize: 13,
  },
  input: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    color: AquariumTheme.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  notesInput: {
    minHeight: 96,
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.surfaceMint,
    borderColor: AquariumTheme.borderMint,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  actions: {
    gap: 10,
    marginTop: 6,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.primary,
    borderRadius: 8,
    padding: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  secondaryButtonText: {
    color: AquariumTheme.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
