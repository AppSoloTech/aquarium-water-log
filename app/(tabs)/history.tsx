import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ReadingValueGrid, StatusInsight, TrendStrip } from '@/components/reading-summary';
import { TankDropdown } from '@/components/tank-dropdown';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  Section,
  StatusPill,
} from '@/components/ui';
import { WaterTrendChart, type TrendPoint } from '@/components/water-trend-chart';
import {
  deleteWaterTest,
  getAllWaterTests,
  getAnalyteRanges,
  getTanks,
  type AnalyteKey,
  type AnalyteRange,
  type Tank,
  type WaterTest,
} from '@/lib/database';
import { shareWaterTestsCsv } from '@/lib/export-csv';
import { ANALYTE_LABELS, getOverallStatus } from '@/lib/water-status';
import { useTheme } from '@/theme';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

const chartAnalytes: AnalyteKey[] = ['nitrate_no3', 'nitrite_no2', 'ph', 'kh', 'gh'];

export default function HistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ tankId?: string }>();
  const routeTankId = Number(params.tankId);
  const appliedRouteTankIdRef = useRef<number | null>(null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<number | null>(
    Number.isFinite(routeTankId) && routeTankId > 0 ? routeTankId : null,
  );
  const [tests, setTests] = useState<WaterTest[]>([]);
  const [rangesByTank, setRangesByTank] = useState<Record<number, AnalyteRange[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [selectedAnalyte, setSelectedAnalyte] = useState<AnalyteKey>('nitrate_no3');

  const loadTests = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const [savedTanks, savedTests] = await Promise.all([
        getTanks(),
        getAllWaterTests(selectedTankId),
      ]);

      const uniqueTankIds = Array.from(
        new Set(savedTests.map((t) => t.tank_id).filter((id): id is number => id !== null)),
      );
      const rangeEntries = await Promise.all(
        uniqueTankIds.map(async (tankId) => [tankId, await getAnalyteRanges(tankId)] as const),
      );

      setTanks(savedTanks);
      setTests(savedTests);
      setRangesByTank(Object.fromEntries(rangeEntries));
    } catch (error) {
      console.error(error);
      setErrorMessage('Could not load test history.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTankId]);

  useFocusEffect(
    useCallback(() => {
      const hasRouteTank = Number.isFinite(routeTankId) && routeTankId > 0;

      if (hasRouteTank && appliedRouteTankIdRef.current !== routeTankId) {
        appliedRouteTankIdRef.current = routeTankId;
        if (selectedTankId !== routeTankId) {
          setSelectedTankId(routeTankId);
          return;
        }
      }

      loadTests();
    }, [loadTests, routeTankId, selectedTankId]),
  );

  function confirmDelete(test: WaterTest) {
    Alert.alert('Delete test?', `Delete the ${formatDate(test.tested_at)} test for ${test.tank_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWaterTest(test.id);
            await loadTests();
          } catch (error) {
            console.error(error);
            Alert.alert('Delete failed', 'The water test could not be deleted.');
          }
        },
      },
    ]);
  }

  async function exportCsv() {
    try {
      setExporting(true);
      await shareWaterTestsCsv(tests);
    } catch (error) {
      console.error(error);
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Could not export CSV.');
    } finally {
      setExporting(false);
    }
  }

  async function addTestFromHistory() {
    router.push(
      selectedTankId
        ? ({ pathname: '/add-test', params: { tankId: String(selectedTankId) } } as never)
        : ('/add-test' as never),
    );
  }

  const trendTankIds = Array.from(
    new Set(tests.map((t) => t.tank_id).filter((id): id is number => id !== null)),
  );
  const chartTankId = selectedTankId ?? (trendTankIds.length === 1 ? trendTankIds[0] : null);
  const chartTank = tanks.find((tank) => tank.id === chartTankId) ?? null;
  const chartPoints: TrendPoint[] =
    chartTankId === null
      ? []
      : tests
          .filter((test) => test.tank_id === chartTankId && test[selectedAnalyte] !== null)
          .map((test) => ({
            id: test.id,
            testedAt: test.tested_at,
            tankName: test.tank_name || 'Unnamed tank',
            value: test[selectedAnalyte] ?? 0,
            didWaterChange: Boolean(test.did_water_change),
          }));
  const chartRange = rangesByTank[chartTankId ?? -1]?.find(
    (range) => range.analyte_key === selectedAnalyte,
  );

  return (
    <Screen>
      <Section
        title="History"
        trailing={
          <Button
            label={exporting ? 'Exporting...' : 'Export CSV'}
            size="sm"
            variant="secondary"
            leftIcon="square.and.arrow.up.fill"
            onPress={exportCsv}
            loading={exporting}
            disabled={tests.length === 0}
            accessibilityHint="Shares all currently visible tests as a CSV file"
          />
        }
      />

      <TankDropdown
        label="History scope"
        tanks={tanks}
        selectedTankId={selectedTankId}
        onSelect={setSelectedTankId}
        includeAllOption
      />

      {!isLoading && !errorMessage && tests.length > 0 ? (
        <Card variant="accent" padding="md" elevation="sm">
          <View style={[styles.cardHeader, { gap: theme.spacing.md }]}>
            <View style={styles.flexShrink}>
              <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>Trends</Text>
              <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
                {chartTank ? chartTank.name : 'Select one tank to chart readings'}
              </Text>
            </View>
          </View>

          <View style={[styles.analyteRow, { gap: theme.spacing.sm }]}>
            {chartAnalytes.map((analyte) => (
              <Chip
                key={analyte}
                label={ANALYTE_LABELS[analyte]}
                selected={analyte === selectedAnalyte}
                onPress={() => setSelectedAnalyte(analyte)}
                size="sm"
              />
            ))}
          </View>

          {chartTankId ? (
            <WaterTrendChart
              analyteKey={selectedAnalyte}
              points={chartPoints}
              range={chartRange}
              onEditPoint={(id) =>
                router.push({ pathname: '/edit-test', params: { id: String(id) } } as never)
              }
            />
          ) : (
            <Card variant="muted" padding="md" elevation="none">
              <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
                Trends are easiest to read one tank at a time. Choose a tank from History scope.
              </Text>
            </Card>
          )}
        </Card>
      ) : null}

      {isLoading ? (
        <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
          Loading tests...
        </Text>
      ) : null}

      {!isLoading && errorMessage ? (
        <Card variant="warning" padding="md" elevation="none">
          <Text style={[theme.typography.bodyMd, { color: theme.colors.danger }]}>{errorMessage}</Text>
        </Card>
      ) : null}

      {!isLoading && !errorMessage && tests.length === 0 ? (
        <EmptyState
          icon="list.bullet"
          tone="info"
          title="No tests saved yet"
          description={
            selectedTankId
              ? 'This tank does not have any readings yet.'
              : 'Your saved readings will appear here newest first.'
          }
          action={{ label: 'Add First Test', onPress: addTestFromHistory }}
        />
      ) : null}

      {tests.map((test, index) => {
        const status = getOverallStatus(test, test.tank_id ? rangesByTank[test.tank_id] : []);
        const previousTest =
          test.tank_id === null
            ? null
            : tests.find(
                (candidate, candidateIndex) =>
                  candidateIndex > index && candidate.tank_id === test.tank_id,
              ) ?? null;

        return (
          <Card key={test.id} variant="standard" padding="md" elevation="sm">
            <View style={[styles.cardHeader, { gap: theme.spacing.md }]}>
              <View style={styles.flexShrink}>
                <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>
                  {test.tank_name || 'Unnamed tank'}
                </Text>
                <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
                  {formatDate(test.tested_at)}
                </Text>
              </View>
              <StatusPill status={status} />
            </View>

            <ReadingValueGrid test={test} ranges={test.tank_id ? rangesByTank[test.tank_id] : []} />
            <StatusInsight test={test} ranges={test.tank_id ? rangesByTank[test.tank_id] : []} />
            <TrendStrip test={test} previousTest={previousTest} />

            {test.notes ? (
              <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
                {test.notes}
              </Text>
            ) : null}

            <View style={[styles.cardFooter, { gap: theme.spacing.sm }]}>
              <Text style={[theme.typography.bodySm, styles.flex1, { color: theme.colors.textMuted }]}>
                Water change: {test.did_water_change ? 'Yes' : 'No'}
              </Text>
              <Button
                label="Edit"
                size="sm"
                variant="secondary"
                leftIcon="pencil"
                onPress={() =>
                  router.push({ pathname: '/edit-test', params: { id: String(test.id) } } as never)
                }
                accessibilityLabel={`Edit ${test.tank_name || 'this'} test from ${formatDate(test.tested_at)}`}
              />
              <Button
                label="Delete"
                size="sm"
                variant="danger"
                leftIcon="trash.fill"
                onPress={() => confirmDelete(test)}
                haptic="warning"
                accessibilityLabel={`Delete ${test.tank_name || 'this'} test from ${formatDate(test.tested_at)}`}
              />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flexShrink: { flex: 1, gap: 2 },
  analyteRow: { flexDirection: 'row', flexWrap: 'wrap' },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  flex1: { flex: 1 },
});
