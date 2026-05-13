import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';

import { Screen, Section } from '@/components/ui';
import { WaterTestForm, type WaterTestFormState } from '@/components/water-test-form';
import {
  getTanks,
  getWaterTest,
  type NewWaterTest,
  type Tank,
  updateWaterTest,
} from '@/lib/database';
import {
  blankNumbers,
  numberFields,
  parseWaterTestNumbers,
  valueToInput,
} from '@/lib/water-test-form';
import { useTheme } from '@/theme';

export default function EditTestScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const testId = Number(params.id);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [state, setState] = useState<WaterTestFormState>({
    selectedTankId: null,
    testedAt: new Date(),
    numbers: blankNumbers(),
    notes: '',
    didWaterChange: false,
  });
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
        const savedDate = new Date(test.tested_at);
        setState({
          selectedTankId: test.tank_id ?? savedTanks[0]?.id ?? null,
          testedAt: Number.isNaN(savedDate.getTime()) ? new Date() : savedDate,
          numbers: {
            nitrate_no3: valueToInput(test.nitrate_no3),
            nitrite_no2: valueToInput(test.nitrite_no2),
            ph: valueToInput(test.ph),
            kh: valueToInput(test.kh),
            gh: valueToInput(test.gh),
          },
          notes: test.notes ?? '',
          didWaterChange: Boolean(test.did_water_change),
        });
      } catch (error) {
        console.error(error);
        Alert.alert('Load failed', 'Could not load this water test.');
      } finally {
        setIsLoading(false);
      }
    }

    loadTest();
  }, [router, testId]);

  function update(next: Partial<WaterTestFormState>) {
    setState((current) => ({ ...current, ...next }));
  }

  async function saveTest() {
    if (isSaving) {
      return;
    }

    if (!state.selectedTankId) {
      Alert.alert('Choose a tank', 'Select a tank before saving this test.');
      return;
    }

    const parsedNumbers = parseWaterTestNumbers(state.numbers);
    const invalidField = numberFields.find((field) => Number.isNaN(parsedNumbers[field.key]));

    if (invalidField) {
      Alert.alert('Check this value', `${invalidField.label} must be a number if filled in.`);
      return;
    }

    const test: NewWaterTest = {
      tank_id: state.selectedTankId,
      tested_at: state.testedAt.toISOString(),
      nitrate_no3: parsedNumbers.nitrate_no3,
      nitrite_no2: parsedNumbers.nitrite_no2,
      ph: parsedNumbers.ph,
      kh: parsedNumbers.kh,
      gh: parsedNumbers.gh,
      did_water_change: state.didWaterChange ? 1 : 0,
      notes: state.notes.trim() || null,
    };

    try {
      setIsSaving(true);
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
    <Screen keyboardAvoiding edges={[]}>
      <Section title="Edit Water Test" />
      {isLoading ? (
        <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>Loading test...</Text>
      ) : (
        <WaterTestForm
          tanks={tanks}
          state={state}
          onChange={update}
          onSubmit={saveTest}
          onCancel={() => router.back()}
          submitLabel="Save Changes"
          isSaving={isSaving}
        />
      )}
    </Screen>
  );
}
