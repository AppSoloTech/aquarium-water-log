import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
  getTanks,
  getWaterTest,
  setDefaultTankId,
  type NewWaterTest,
  type Tank,
  updateWaterTest,
} from '@/lib/database';
import {
  blankNumbers,
  numberFields,
  parseWaterTestNumbers,
  valueToInput,
  type NumberField,
} from '@/lib/water-test-form';

export default function EditTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const testId = Number(params.id);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null);
  const [testedAt, setTestedAt] = useState(new Date());
  const [numbers, setNumbers] = useState(blankNumbers);
  const [notes, setNotes] = useState('');
  const [didWaterChange, setDidWaterChange] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadTest() {
      if (!Number.isFinite(testId)) {
        Alert.alert('Missing test', 'This test could not be found.');
        router.back();
        return;
      }

      try {
        const [savedTanks, test] = await Promise.all([getTanks(), getWaterTest(testId)]);

        if (!test) {
          Alert.alert('Missing test', 'This test could not be found.');
          router.back();
          return;
        }

        setTanks(savedTanks);
        setSelectedTankId(test.tank_id ?? savedTanks[0]?.id ?? null);
        const savedDate = new Date(test.tested_at);
        setTestedAt(Number.isNaN(savedDate.getTime()) ? new Date() : savedDate);
        setNumbers({
          nitrate_no3: valueToInput(test.nitrate_no3),
          nitrite_no2: valueToInput(test.nitrite_no2),
          ph: valueToInput(test.ph),
          kh: valueToInput(test.kh),
          gh: valueToInput(test.gh),
        });
        setNotes(test.notes ?? '');
        setDidWaterChange(Boolean(test.did_water_change));
      } catch (error) {
        console.error(error);
        Alert.alert('Load failed', 'Could not load this water test.');
      } finally {
        setIsLoading(false);
      }
    }

    loadTest();
  }, [router, testId]);

  function updateNumberField(key: NumberField, value: string) {
    setNumbers((current) => ({ ...current, [key]: value }));
  }

  async function saveTest() {
    if (!selectedTankId) {
      Alert.alert('Choose a tank', 'Select a tank before saving this test.');
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
      await updateWaterTest(testId, test);
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Save failed', 'The water test could not be updated. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Edit Water Test</Text>

        {isLoading ? <Text style={styles.helpText}>Loading test...</Text> : null}

        {!isLoading ? (
          <>
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
                <Text style={styles.primaryButtonText}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : null}
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
    paddingTop: 24,
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
  label: {
    color: AquariumTheme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  helpText: {
    color: AquariumTheme.muted,
    fontSize: 13,
    lineHeight: 20,
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
