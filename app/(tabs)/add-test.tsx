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

import { TankDropdown } from '@/components/tank-dropdown';
import { AquariumTheme } from '@/constants/aquarium-theme';
import {
  getDefaultTankId,
  getTanks,
  insertWaterTest,
  type NewWaterTest,
  type Tank,
} from '@/lib/database';

type NumberField = 'nitrate_no3' | 'nitrite_no2' | 'ph' | 'kh' | 'gh';

const numberFields: { key: NumberField; label: string; placeholder: string }[] = [
  { key: 'nitrate_no3', label: 'NO3 nitrate', placeholder: 'Example: 20' },
  { key: 'nitrite_no2', label: 'NO2 nitrite', placeholder: 'Example: 0' },
  { key: 'ph', label: 'pH', placeholder: 'Example: 7.2' },
  { key: 'kh', label: 'KH', placeholder: 'Example: 4' },
  { key: 'gh', label: 'GH', placeholder: 'Example: 8' },
];

function blankNumbers() {
  return {
    nitrate_no3: '',
    nitrite_no2: '',
    ph: '',
    kh: '',
    gh: '',
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const numberValue = Number(trimmed);

  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

export default function AddTestScreen() {
  const router = useRouter();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null);
  const [testedAt, setTestedAt] = useState(new Date().toISOString());
  const [numbers, setNumbers] = useState(blankNumbers);
  const [notes, setNotes] = useState('');
  const [didWaterChange, setDidWaterChange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shouldAutoSelectTank, setShouldAutoSelectTank] = useState(true);

  const loadTanks = useCallback(async () => {
    const [savedTanks, defaultTankId] = await Promise.all([getTanks(), getDefaultTankId()]);

    setTanks(savedTanks);
    setSelectedTankId((current) =>
      current ?? (shouldAutoSelectTank ? defaultTankId ?? savedTanks[0]?.id ?? null : null),
    );
  }, [shouldAutoSelectTank]);

  useFocusEffect(
    useCallback(() => {
      setTestedAt(new Date().toISOString());
      loadTanks();
    }, [loadTanks]),
  );

  function resetForm() {
    setTestedAt(new Date().toISOString());
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

    const parsedNumbers = {
      nitrate_no3: parseOptionalNumber(numbers.nitrate_no3),
      nitrite_no2: parseOptionalNumber(numbers.nitrite_no2),
      ph: parseOptionalNumber(numbers.ph),
      kh: parseOptionalNumber(numbers.kh),
      gh: parseOptionalNumber(numbers.gh),
    };

    const invalidField = numberFields.find((field) => Number.isNaN(parsedNumbers[field.key]));

    if (invalidField) {
      Alert.alert('Check this value', `${invalidField.label} must be a number if filled in.`);
      return;
    }

    const test: NewWaterTest = {
      tank_id: selectedTankId,
      tested_at: testedAt,
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
      await insertWaterTest(test);
      resetForm();
      setShouldAutoSelectTank(false);
      setSelectedTankId(null);
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

        <View style={styles.field}>
          <Text style={styles.label}>Test date/time</Text>
          <TextInput
            autoCapitalize="none"
            style={styles.input}
            value={testedAt}
            onChangeText={setTestedAt}
            placeholder="2026-05-10T12:00:00.000Z"
          />
        </View>

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
