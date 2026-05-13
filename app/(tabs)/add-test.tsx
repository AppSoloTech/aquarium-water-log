import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { EmptyState, Screen, Section } from '@/components/ui';
import { WaterTestForm, type WaterTestFormState } from '@/components/water-test-form';
import {
  getTanks,
  insertWaterTest,
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

function hasDraftContent(state: WaterTestFormState) {
  return (
    state.notes.trim().length > 0 ||
    state.didWaterChange ||
    Object.values(state.numbers).some((value) => value.trim().length > 0)
  );
}

export default function AddTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tankId?: string }>();
  const routeTankId = useMemo(() => {
    const parsed = Number(params.tankId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params.tankId]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [state, setState] = useState<WaterTestFormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);

  const loadTanks = useCallback(async () => {
    const savedTanks = await getTanks();
    const routeTankExists = routeTankId
      ? savedTanks.some((tank) => tank.id === routeTankId)
      : false;
    setTanks(savedTanks);
    setState((current) => ({
      ...current,
      selectedTankId: routeTankExists
        ? routeTankId
        : hasDraftContent(current)
          ? current.selectedTankId
          : null,
    }));
  }, [routeTankId]);

  useFocusEffect(
    useCallback(() => {
      loadTanks();
    }, [loadTanks]),
  );

  function update(next: Partial<WaterTestFormState>) {
    setState((current) => ({ ...current, ...next }));
  }

  function discardDraft() {
    setState({
      ...initialState(),
      selectedTankId: routeTankId && tanks.some((tank) => tank.id === routeTankId) ? routeTankId : null,
    });
  }

  async function saveTest() {
    if (isSaving) {
      return;
    }

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
        onDiscard={discardDraft}
        submitLabel="Save Test"
        isSaving={isSaving}
      />
    </Screen>
  );
}
