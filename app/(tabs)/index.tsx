import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ReadingValueGrid, StatusInsight } from '@/components/reading-summary';
import {
  Button,
  Card,
  EmptyState,
  Screen,
  Section,
  SkeletonReadingCard,
  StatusPill,
} from '@/components/ui';
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
import { useTheme } from '@/theme';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function daysSince(value: string | null) {
  if (!value) return null;
  const testedAt = new Date(value).getTime();
  if (Number.isNaN(testedAt)) return null;
  return Math.max(0, Math.floor((Date.now() - testedAt) / (1000 * 60 * 60 * 24)));
}

function lastTestedSummary(value: string | null) {
  const days = daysSince(value);
  if (days === null) return 'No test date yet';
  if (days === 0) return 'Tested today';
  if (days === 1) return '1 day since last test';
  return `${days} days since last test`;
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
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

  function logTankTest(tankId: number) {
    router.push({ pathname: '/add-test', params: { tankId: String(tankId) } } as never);
  }

  return (
    <Screen>
      <Card variant="primary" elevation="md" padding="lg">
        <Text
          style={[theme.typography.displayMd, { color: theme.colors.primaryContent }]}
          accessibilityRole="header">
          Aquarium Water Log
        </Text>
        <Text style={[theme.typography.bodyLg, styles.heroSub, { color: theme.colors.primaryContent }]}>
          Manage tanks, then log each water test under the right tank.
        </Text>
      </Card>

      {tanks.length > 0 ? (
        <Section
          title="Your Tanks"
          trailing={
            <Text
              style={[theme.typography.titleLg, { color: theme.colors.accent }]}
              accessibilityLabel={`${tanks.length} tanks`}>
              {tanks.length}
            </Text>
          }>
          <Card variant="muted" elevation="none" padding="md">
            <View style={{ gap: theme.spacing.sm }}>
              {tanks.map((tank, index) => (
                <View
                  key={tank.id}
                  style={[
                    styles.tankRow,
                    index > 0 && {
                      borderTopColor: theme.colors.border,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      paddingTop: theme.spacing.sm,
                    },
                  ]}>
                  <Text style={[theme.typography.titleSm, { color: theme.colors.text }]}>
                    {tank.name}
                  </Text>
                  <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
                    {tank.test_count} {tank.test_count === 1 ? 'test' : 'tests'} •{' '}
                    {tank.latest_tested_at ? formatDate(tank.latest_tested_at) : 'No tests yet'}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </Section>
      ) : null}

      {tanks.length > 0 && totalTests < 1 ? (
        <Card variant="warning" elevation="sm" padding="md">
          <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>Quick Start</Text>
          <Text style={[theme.typography.bodyMd, { color: theme.colors.text }]}>
            ✓ Create a tank
          </Text>
          <Text style={[theme.typography.bodyMd, { color: theme.colors.text }]}>
            → Log your first water test
          </Text>
          <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
            Later: set target ranges and reminders
          </Text>
          <Button
            label="Test"
            onPress={() => logTankTest(tanks[0].id)}
            leftIcon="plus.circle.fill"
            fullWidth
            accessibilityHint="Opens the add test screen for your first tank"
          />
        </Card>
      ) : null}

      <Section title="Latest Reading">
        {isLoading ? (
          <View style={{ gap: theme.spacing.md }}>
            <SkeletonReadingCard />
            <SkeletonReadingCard />
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <Card variant="warning" padding="md" elevation="none">
            <Text style={[theme.typography.bodyMd, { color: theme.colors.danger }]}>
              {errorMessage}
            </Text>
          </Card>
        ) : null}

        {!isLoading && !errorMessage && tanks.length === 0 ? (
          <EmptyState
            icon="drop.fill"
            tone="info"
            title="No tanks yet"
            description="Create your first tank to start building a reading history."
            action={{ label: 'Create Tank', onPress: () => router.push('/tanks' as never) }}
          />
        ) : null}

        {!isLoading && !errorMessage && tanks.length > 0
          ? tanks.map((tank) => {
              const latestTest = latestByTankId[tank.id] ?? null;
              const status = getOverallStatus(latestTest, rangesByTank[tank.id] ?? []);

              return (
                <Card key={tank.id} variant="standard" elevation="sm" padding="md">
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderText}>
                      <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>
                        {tank.name}
                      </Text>
                      <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
                        {lastTestedSummary(tank.latest_tested_at)}
                      </Text>
                    </View>
                    {latestTest ? <StatusPill status={status} /> : null}
                  </View>

                  {latestTest ? (
                    <View style={{ gap: theme.spacing.sm }}>
                      <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
                        Last tested {formatDate(latestTest.tested_at)}
                      </Text>
                      <ReadingValueGrid test={latestTest} ranges={rangesByTank[tank.id] ?? []} />
                      <StatusInsight test={latestTest} ranges={rangesByTank[tank.id] ?? []} />
                      <Text style={[theme.typography.bodySm, { color: theme.colors.text }]}>
                        Water change: {latestTest.did_water_change ? 'Yes' : 'No'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
                      No readings logged for this tank yet.
                    </Text>
                  )}

                  <View style={[styles.cardActions, { gap: theme.spacing.sm }]}>
                    <Button
                      label="Test"
                      onPress={() => logTankTest(tank.id)}
                      leftIcon="plus.circle.fill"
                      fullWidth
                      style={styles.flex1}
                      accessibilityLabel={`Log test for ${tank.name}`}
                      accessibilityHint="Opens the add test screen for this tank"
                    />
                    <Button
                      label="History"
                      variant="secondary"
                      leftIcon="list.bullet"
                      onPress={() =>
                        router.push({ pathname: '/history', params: { tankId: String(tank.id) } } as never)
                      }
                      fullWidth
                      style={styles.flex1}
                      accessibilityLabel={`View history for ${tank.name}`}
                    />
                  </View>
                </Card>
              );
            })
          : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroSub: { opacity: 0.88 },
  tankRow: { gap: 2 },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  cardHeaderText: { flexShrink: 1, gap: 2 },
  cardActions: { flexDirection: 'row' },
  flex1: { flex: 1 },
});
