import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { EmptyState, Screen, Section } from '@/components/ui';
import { WaterTestForm, type WaterTestFormState } from '@/components/water-test-form';
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
} from '@/lib/water-test-form';

function initialState(): WaterTestFormState {
  return {
    selectedTankId: null,
    testedAt: new Date(),
    numbers: blankNumbers(),
    notes: '',
    didWaterChange: false,
  };
}

export default function AddTestScreen() {
  const router = useRouter();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [state, setState] = useState<WaterTestFormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);

  const loadTanks = useCallback(async () => {
    const [savedTanks, defaultTankId] = await Promise.all([getTanks(), getDefaultTankId()]);
    setTanks(savedTanks);
    setState((current) => ({
      ...current,
      testedAt: new Date(),
      selectedTankId: current.selectedTankId ?? defaultTankId ?? savedTanks[0]?.id ?? null,
    }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTanks();
    }, [loadTanks]),
  );

  function update(next: Partial<WaterTestFormState>) {
    setState((current) => ({ ...current, ...next }));
  }

  async function saveTest() {
    if (!state.selectedTankId) {
      Alert.alert('Choose a tank', 'Create or select a tank before saving this test.');
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
      await setDefaultTankId(state.selectedTankId);
      await insertWaterTest(test);
      setState(initialState);
      router.push('/history' as never);
    } catch (error) {
      console.error(error);
      Alert.alert('Save failed', 'The water test could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (tanks.length === 0) {
    return (
      <Screen>
        <Section title="Add Water Test" />
        <EmptyState
          icon="drop.fill"
          tone="warning"
          title="Create a tank first"
          description="Tests are saved under a tank, so add your first tank before logging readings."
          action={{ label: 'Add Tank', onPress: () => router.push('/tanks' as never) }}
        />
      </Screen>
    );
  }

  return (
    <Screen keyboardAvoiding>
      <Section title="Add Water Test" />
      <WaterTestForm
        tanks={tanks}
        state={state}
        onChange={update}
        onSubmit={saveTest}
        submitLabel="Save Test"
        isSaving={isSaving}
      />
    </Screen>
  );
}
