import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { AquariumTheme } from '@/constants/aquarium-theme';
import {
  getAnalyteRanges,
  getLatestWaterTestsByTank,
  getTankSummaries,
  initDatabase,
  type AnalyteRange,
  type TankSummary,
  type WaterTest,
} from '@/lib/database';
import { getOverallStatus } from '@/lib/water-status';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatValue(label: string, value: number | null) {
  return `${label}: ${value === null ? '-' : value}`;
}

export default function HomeScreen() {
  const [latestTests, setLatestTests] = useState<WaterTest[]>([]);
  const [rangesByTank, setRangesByTank] = useState<Record<number, AnalyteRange[]>>({});
  const [tanks, setTanks] = useState<TankSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadLatestTest = useCallback(async () => {
    try {
      setErrorMessage('');
      await initDatabase();
      const [tankSummaries, tankLatestTests] = await Promise.all([
        getTankSummaries(),
        getLatestWaterTestsByTank(),
      ]);
      const rangeEntries = await Promise.all(
        tankLatestTests
          .map((test) => test.tank_id)
          .filter((tankId): tankId is number => tankId !== null)
          .map(async (tankId) => [tankId, await getAnalyteRanges(tankId)] as const),
      );

      setTanks(tankSummaries);
      setLatestTests(tankLatestTests);
      setRangesByTank(Object.fromEntries(rangeEntries));
    } catch (error) {
      setErrorMessage('Could not load your latest test.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLatestTest();
    }, [loadLatestTest]),
  );

  const latestByTankId = latestTests.reduce<Record<number, WaterTest>>((result, test) => {
    if (test.tank_id) {
      result[test.tank_id] = test;
    }

    return result;
  }, {});

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Aquarium Water Log</Text>
        <Text style={styles.subtitle}>Manage tanks, then log each water test under the right tank.</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Your Tanks</Text>
          <Text style={styles.countText}>{tanks.length}</Text>
        </View>

        {tanks.length === 0 ? (
          <Text style={styles.mutedText}>Create your first tank to start logging scoped tests.</Text>
        ) : null}

        {tanks.map((tank) => (
          <View key={tank.id} style={styles.tankRow}>
            <View style={styles.tankRowText}>
              <Text style={styles.tankName}>{tank.name}</Text>
              <Text style={styles.mutedText}>
                {tank.test_count} {tank.test_count === 1 ? 'test' : 'tests'} • Last:{' '}
                {tank.latest_tested_at ? formatDate(tank.latest_tested_at) : 'No tests yet'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Latest Reading</Text>

      {isLoading ? <Text style={styles.mutedText}>Loading latest readings...</Text> : null}

      {!isLoading && errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {!isLoading && !errorMessage && tanks.length === 0 ? (
        <Text style={styles.mutedText}>
          No tanks yet. Create your first tank to start building a reading history.
        </Text>
      ) : null}

      {!isLoading && !errorMessage && tanks.length > 0
        ? tanks.map((tank) => {
            const latestTest = latestByTankId[tank.id] ?? null;
            const status = getOverallStatus(latestTest, rangesByTank[tank.id] ?? []);

            return (
              <View key={tank.id} style={styles.readingCard}>
                <View style={styles.panelHeader}>
                  <Text style={styles.tankName}>{tank.name}</Text>
                  {latestTest ? <StatusBadge status={status} /> : null}
                </View>

                {latestTest ? (
                  <View style={styles.summaryGrid}>
                    <Text style={styles.mutedText}>Last tested {formatDate(latestTest.tested_at)}</Text>
                    <Text style={styles.valueText}>{formatValue('NO3', latestTest.nitrate_no3)}</Text>
                    <Text style={styles.valueText}>{formatValue('NO2', latestTest.nitrite_no2)}</Text>
                    <Text style={styles.valueText}>{formatValue('pH', latestTest.ph)}</Text>
                    <Text style={styles.valueText}>{formatValue('KH', latestTest.kh)}</Text>
                    <Text style={styles.valueText}>{formatValue('GH', latestTest.gh)}</Text>
                    <Text style={styles.valueText}>
                      Water change: {latestTest.did_water_change ? 'Yes' : 'No'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.mutedText}>No readings logged for this tank yet.</Text>
                )}
              </View>
            );
          })
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AquariumTheme.screen,
    flexGrow: 1,
    gap: 16,
    padding: 20,
    paddingTop: 56,
  },
  hero: {
    backgroundColor: AquariumTheme.primaryDark,
    borderColor: '#38bdf8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: '#dff7ff',
    fontSize: 16,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: AquariumTheme.surfaceMint,
    borderColor: AquariumTheme.borderMint,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    elevation: 2,
    padding: 16,
    shadowColor: AquariumTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: AquariumTheme.primaryDark,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionTitle: {
    color: AquariumTheme.primaryDark,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  readingCard: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    elevation: 1,
    padding: 16,
    shadowColor: AquariumTheme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tankName: {
    color: AquariumTheme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  summaryGrid: {
    gap: 8,
  },
  valueText: {
    color: AquariumTheme.text,
    fontSize: 16,
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
  countText: {
    color: AquariumTheme.coral,
    fontSize: 18,
    fontWeight: '800',
  },
  tankRow: {
    borderTopColor: AquariumTheme.borderMint,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  tankRowText: {
    gap: 2,
  },
});
