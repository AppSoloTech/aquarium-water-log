import { StyleSheet, Text, View } from 'react-native';

import { AquariumTheme } from '@/constants/aquarium-theme';
import type { AnalyteKey, AnalyteRange, WaterTest } from '@/lib/database';
import {
  ANALYTE_LABELS,
  getReadingIssues,
  getStatusColor,
  getStatusSummary,
  type ReadingIssue,
} from '@/lib/water-status';

const readingKeys: AnalyteKey[] = ['nitrate_no3', 'nitrite_no2', 'ph', 'kh', 'gh'];
const trendKeys: AnalyteKey[] = ['nitrate_no3', 'nitrite_no2', 'ph'];

function getValue(test: WaterTest, key: AnalyteKey) {
  return test[key];
}

function formatValue(value: number | null) {
  return value === null ? '-' : String(value);
}

function trendText(current: number, previous: number) {
  const delta = Number((current - previous).toFixed(2));

  if (delta === 0) {
    return 'same';
  }

  return `${delta > 0 ? '+' : ''}${delta}`;
}

function getTrendTone(key: AnalyteKey, current: number, previous: number) {
  if (current === previous) {
    return AquariumTheme.muted;
  }

  if (key === 'nitrate_no3' || key === 'nitrite_no2') {
    return current < previous ? AquariumTheme.teal : AquariumTheme.coral;
  }

  return AquariumTheme.primary;
}

function issueMapByKey(issues: ReadingIssue[]) {
  return issues.reduce<Record<string, ReadingIssue>>((result, issue) => {
    result[issue.analyteKey] = issue;

    return result;
  }, {});
}

export function ReadingValueGrid({
  test,
  ranges,
}: {
  test: WaterTest;
  ranges: AnalyteRange[];
}) {
  const issues = issueMapByKey(getReadingIssues(test, ranges));

  return (
    <View style={styles.grid}>
      {readingKeys.map((key) => {
        const issue = issues[key];
        const color = issue ? getStatusColor(issue.status) : AquariumTheme.teal;

        return (
          <View
            key={key}
            style={[
              styles.valueChip,
              issue ? { borderColor: color, backgroundColor: `${color}12` } : null,
            ]}>
            <Text style={[styles.valueLabel, issue ? { color } : null]}>{ANALYTE_LABELS[key]}</Text>
            <Text style={[styles.valueNumber, issue ? { color } : null]}>
              {formatValue(getValue(test, key))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function StatusInsight({
  test,
  ranges,
}: {
  test: WaterTest | null;
  ranges: AnalyteRange[];
}) {
  const issues = getReadingIssues(test, ranges);

  return (
    <View style={styles.insight}>
      <Text style={styles.insightText}>{getStatusSummary(test, ranges)}</Text>
      {issues.slice(1, 3).map((issue) => (
        <Text key={issue.analyteKey} style={styles.insightSecondary}>
          {issue.message}
        </Text>
      ))}
    </View>
  );
}

export function TrendStrip({
  test,
  previousTest,
}: {
  test: WaterTest;
  previousTest: WaterTest | null;
}) {
  if (!previousTest) {
    return null;
  }

  const trends = trendKeys
    .map((key) => {
      const current = getValue(test, key);
      const previous = getValue(previousTest, key);

      if (current === null || previous === null) {
        return null;
      }

      return { key, current, previous };
    })
    .filter((trend): trend is { key: AnalyteKey; current: number; previous: number } => trend !== null);

  if (trends.length === 0) {
    return null;
  }

  return (
    <View style={styles.trendRow}>
      <Text style={styles.trendLead}>Since previous</Text>
      {trends.map((trend) => {
        const color = getTrendTone(trend.key, trend.current, trend.previous);

        return (
          <View key={trend.key} style={styles.trendChip}>
            <Text style={styles.trendLabel}>{ANALYTE_LABELS[trend.key]}</Text>
            <Text style={[styles.trendValue, { color }]}>
              {trendText(trend.current, trend.previous)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valueChip: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 86,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  valueLabel: {
    color: AquariumTheme.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  valueNumber: {
    color: AquariumTheme.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  insight: {
    backgroundColor: AquariumTheme.surfaceMint,
    borderColor: AquariumTheme.borderMint,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 10,
  },
  insightText: {
    color: AquariumTheme.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  insightSecondary: {
    color: AquariumTheme.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  trendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trendLead: {
    color: AquariumTheme.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  trendChip: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  trendLabel: {
    color: AquariumTheme.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  trendValue: {
    fontSize: 13,
    fontWeight: '900',
  },
});
