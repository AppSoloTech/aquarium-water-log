import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ReadingValueGrid, StatusInsight, TrendStrip } from '@/components/reading-summary';
import { StatusBadge } from '@/components/status-badge';
import { TankDropdown } from '@/components/tank-dropdown';
import { WaterTrendChart, type TrendPoint } from '@/components/water-trend-chart';
import { AquariumTheme } from '@/constants/aquarium-theme';
import {
  deleteWaterTest,
  getAllWaterTests,
  getAnalyteRanges,
  getTanks,
  setDefaultTankId,
  type AnalyteKey,
  type AnalyteRange,
  type Tank,
  type WaterTest,
} from '@/lib/database';
import { shareWaterTestsCsv } from '@/lib/export-csv';
import { ANALYTE_LABELS, getOverallStatus } from '@/lib/water-status';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

const chartAnalytes: AnalyteKey[] = ['nitrate_no3', 'nitrite_no2', 'ph', 'kh', 'gh'];

export default function HistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tankId?: string }>();
  const routeTankId = Number(params.tankId);
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
      setErrorMessage('');
      const [savedTanks, savedTests] = await Promise.all([
        getTanks(),
        getAllWaterTests(selectedTankId),
      ]);

      const uniqueTankIds = Array.from(
        new Set(savedTests.map((test) => test.tank_id).filter((id): id is number => id !== null)),
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
      loadTests();
    }, [loadTests]),
  );

  useEffect(() => {
    if (Number.isFinite(routeTankId) && routeTankId > 0) {
      setSelectedTankId(routeTankId);
    }
  }, [routeTankId]);

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
    if (selectedTankId) {
      await setDefaultTankId(selectedTankId);
    }

    router.push('/add-test' as never);
  }

  const trendTankIds = Array.from(
    new Set(tests.map((test) => test.tank_id).filter((id): id is number => id !== null)),
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
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>History</Text>
        <Pressable
          style={[styles.exportButton, tests.length === 0 ? styles.disabledButton : null]}
          onPress={exportCsv}
          disabled={tests.length === 0 || exporting}>
          <Text style={styles.exportButtonText}>{exporting ? 'Exporting...' : 'Export CSV'}</Text>
        </Pressable>
      </View>

      <TankDropdown
        label="History scope"
        tanks={tanks}
        selectedTankId={selectedTankId}
        onSelect={setSelectedTankId}
        includeAllOption
      />

      {!isLoading && !errorMessage && tests.length > 0 ? (
        <View style={styles.trendsPanel}>
          <View style={styles.trendsHeader}>
            <View>
              <Text style={styles.trendsTitle}>Trends</Text>
              <Text style={styles.trendsSubtitle}>
                {chartTank ? chartTank.name : 'Select one tank to chart readings'}
              </Text>
            </View>
          </View>

          <View style={styles.analyteRow}>
            {chartAnalytes.map((analyte) => {
              const selected = analyte === selectedAnalyte;

              return (
                <Pressable
                  key={analyte}
                  style={[styles.analyteButton, selected ? styles.selectedAnalyteButton : null]}
                  onPress={() => setSelectedAnalyte(analyte)}>
                  <Text
                    style={[
                      styles.analyteButtonText,
                      selected ? styles.selectedAnalyteButtonText : null,
                    ]}>
                    {ANALYTE_LABELS[analyte]}
                  </Text>
                </Pressable>
              );
            })}
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
            <View style={styles.chartPrompt}>
              <Text style={styles.mutedText}>
                Trends are easiest to read one tank at a time. Choose a tank from History scope.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {isLoading ? <Text style={styles.mutedText}>Loading tests...</Text> : null}
      {!isLoading && errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {!isLoading && !errorMessage && tests.length === 0 ? (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>No tests saved yet</Text>
          <Text style={styles.mutedText}>
            {selectedTankId
              ? 'This tank does not have any readings yet.'
              : 'Your saved readings will appear here newest first.'}
          </Text>
          <Pressable style={styles.primaryButton} onPress={addTestFromHistory}>
            <Text style={styles.primaryButtonText}>Add First Test</Text>
          </Pressable>
        </View>
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
          <View key={test.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.tankName}>{test.tank_name || 'Unnamed tank'}</Text>
                <Text style={styles.mutedText}>{formatDate(test.tested_at)}</Text>
              </View>
              <StatusBadge status={status} />
            </View>

            <ReadingValueGrid test={test} ranges={test.tank_id ? rangesByTank[test.tank_id] : []} />
            <StatusInsight test={test} ranges={test.tank_id ? rangesByTank[test.tank_id] : []} />
            <TrendStrip test={test} previousTest={previousTest} />

            {test.notes ? <Text style={styles.notes}>{test.notes}</Text> : null}

            <View style={styles.cardFooter}>
              <Text style={styles.waterChange}>
                Water change: {test.did_water_change ? 'Yes' : 'No'}
              </Text>
              <Pressable
                style={styles.editButton}
                onPress={() => router.push({ pathname: '/edit-test', params: { id: String(test.id) } } as never)}>
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => confirmDelete(test)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AquariumTheme.screen,
    flexGrow: 1,
    gap: 14,
    padding: 20,
    paddingTop: 64,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  title: {
    color: AquariumTheme.primaryDark,
    fontSize: 28,
    fontWeight: '800',
  },
  exportButton: {
    backgroundColor: AquariumTheme.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
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
  trendsPanel: {
    backgroundColor: AquariumTheme.surfaceMint,
    borderColor: AquariumTheme.borderMint,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  trendsHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  trendsTitle: {
    color: AquariumTheme.primaryDark,
    fontSize: 21,
    fontWeight: '900',
  },
  trendsSubtitle: {
    color: AquariumTheme.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  analyteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  analyteButton: {
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedAnalyteButton: {
    backgroundColor: AquariumTheme.primary,
    borderColor: AquariumTheme.primary,
  },
  analyteButtonText: {
    color: AquariumTheme.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  selectedAnalyteButtonText: {
    color: '#ffffff',
  },
  chartPrompt: {
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  card: {
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 1,
    gap: 12,
    padding: 16,
    shadowColor: AquariumTheme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  tankName: {
    color: AquariumTheme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  notes: {
    color: AquariumTheme.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  waterChange: {
    color: AquariumTheme.muted,
    flex: 1,
    fontSize: 14,
  },
  deleteButton: {
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButton: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: {
    color: AquariumTheme.primary,
    fontWeight: '700',
  },
  deleteButtonText: {
    color: '#b42318',
    fontWeight: '700',
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
  mutedText: {
    color: AquariumTheme.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: AquariumTheme.danger,
    fontSize: 15,
  },
});
