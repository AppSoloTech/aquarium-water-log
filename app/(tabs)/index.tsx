import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ReadingValueGrid, StatusInsight } from '@/components/reading-summary';
import { StatusBadge } from '@/components/status-badge';
import { AquariumTheme } from '@/constants/aquarium-theme';
import {
  getAnalyteRanges,
  getLatestWaterTestsByTank,
  getTankSummaries,
  initDatabase,
  setDefaultTankId,
  type AnalyteRange,
  type TankSummary,
  type WaterTest,
} from '@/lib/database';
import { getOverallStatus } from '@/lib/water-status';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function daysSince(value: string | null) {
  if (!value) {
    return null;
  }

  const testedAt = new Date(value).getTime();

  if (Number.isNaN(testedAt)) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - testedAt) / (1000 * 60 * 60 * 24)));
}

export default function HomeScreen() {
  const router = useRouter();
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
  const totalTests = tanks.reduce((sum, tank) => sum + tank.test_count, 0);

  async function logTankTest(tankId: number) {
    await setDefaultTankId(tankId);
    router.push('/add-test' as never);
  }

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

      {tanks.length > 0 && totalTests < 1 ? (
        <View style={styles.checklistPanel}>
          <Text style={styles.panelTitle}>Quick Start</Text>
          <Text style={styles.checkItem}>Done: Create a tank</Text>
          <Text style={styles.checkItem}>Next: Log your first water test</Text>
          <Text style={styles.checkItem}>Later: Set target ranges and reminders</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => logTankTest(tanks[0].id)}>
            <Text style={styles.primaryButtonText}>Log First Test</Text>
          </Pressable>
        </View>
      ) : null}

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
                  <View style={styles.tankRowText}>
                    <Text style={styles.tankName}>{tank.name}</Text>
                    <Text style={styles.mutedText}>
                      {daysSince(tank.latest_tested_at) === null
                        ? 'No test date yet'
                        : daysSince(tank.latest_tested_at) === 0
                          ? 'Tested today'
                          : `${daysSince(tank.latest_tested_at)} days since last test`}
                    </Text>
                  </View>
                  {latestTest ? <StatusBadge status={status} /> : null}
                </View>

                {latestTest ? (
                  <View style={styles.summaryGrid}>
                    <Text style={styles.mutedText}>Last tested {formatDate(latestTest.tested_at)}</Text>
                    <ReadingValueGrid test={latestTest} ranges={rangesByTank[tank.id] ?? []} />
                    <StatusInsight test={latestTest} ranges={rangesByTank[tank.id] ?? []} />
                    <Text style={styles.valueText}>
                      Water change: {latestTest.did_water_change ? 'Yes' : 'No'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.mutedText}>No readings logged for this tank yet.</Text>
                )}

                <View style={styles.cardActions}>
                  <Pressable style={styles.primaryAction} onPress={() => logTankTest(tank.id)}>
                    <Text style={styles.primaryActionText}>Log Test</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryAction}
                    onPress={() =>
                      router.push({ pathname: '/history', params: { tankId: String(tank.id) } } as never)
                    }>
                    <Text style={styles.secondaryActionText}>View History</Text>
                  </Pressable>
                </View>
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
  checklistPanel: {
    backgroundColor: AquariumTheme.surfaceWarm,
    borderColor: '#fed7aa',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  checkItem: {
    color: AquariumTheme.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
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
  cardActions: {
    flexDirection: 'row',
    gap: 10,
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
    fontWeight: '800',
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.primary,
    borderRadius: 8,
    flex: 1,
    padding: 12,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  secondaryActionText: {
    color: AquariumTheme.primary,
    fontSize: 15,
    fontWeight: '800',
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
