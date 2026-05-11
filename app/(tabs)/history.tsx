import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { TankDropdown } from '@/components/tank-dropdown';
import { AquariumTheme } from '@/constants/aquarium-theme';
import {
  deleteWaterTest,
  getAllWaterTests,
  getAnalyteRanges,
  getTanks,
  type AnalyteRange,
  type Tank,
  type WaterTest,
} from '@/lib/database';
import { shareWaterTestsCsv } from '@/lib/export-csv';
import { getOverallStatus } from '@/lib/water-status';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function valueText(label: string, value: number | null) {
  return `${label} ${value === null ? '-' : value}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null);
  const [tests, setTests] = useState<WaterTest[]>([]);
  const [rangesByTank, setRangesByTank] = useState<Record<number, AnalyteRange[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [exporting, setExporting] = useState(false);

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
          <Pressable style={styles.primaryButton} onPress={() => router.push('/add-test' as never)}>
            <Text style={styles.primaryButtonText}>Add First Test</Text>
          </Pressable>
        </View>
      ) : null}

      {tests.map((test) => {
        const status = getOverallStatus(test, test.tank_id ? rangesByTank[test.tank_id] : []);

        return (
          <View key={test.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.tankName}>{test.tank_name || 'Unnamed tank'}</Text>
                <Text style={styles.mutedText}>{formatDate(test.tested_at)}</Text>
              </View>
              <StatusBadge status={status} />
            </View>

            <Text style={styles.values}>
              {[
                valueText('NO3', test.nitrate_no3),
                valueText('NO2', test.nitrite_no2),
                valueText('pH', test.ph),
                valueText('KH', test.kh),
                valueText('GH', test.gh),
              ].join('  |  ')}
            </Text>

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
  values: {
    color: AquariumTheme.text,
    fontSize: 15,
    lineHeight: 22,
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
