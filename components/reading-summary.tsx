import { StyleSheet, Text, View } from 'react-native';

import type { AnalyteKey, AnalyteRange, WaterTest } from '@/lib/database';
import {
  ANALYTE_LABELS,
  getReadingIssues,
  getStatusSummary,
  type ReadingIssue,
  type ReadingStatus,
} from '@/lib/water-status';
import { useTheme, type ColorTokens } from '@/theme';

const readingKeys: AnalyteKey[] = ['nitrate_no3', 'nitrite_no2', 'ph', 'kh', 'gh'];
const trendKeys: AnalyteKey[] = ['nitrate_no3', 'nitrite_no2', 'ph'];

function getValue(test: WaterTest, key: AnalyteKey) {
  return test[key];
}

function formatValue(value: number | null) {
  return value === null ? '—' : String(value);
}

function trendText(current: number, previous: number) {
  const delta = Number((current - previous).toFixed(2));
  if (delta === 0) return 'same';
  return `${delta > 0 ? '+' : ''}${delta}`;
}

function getTrendTone(key: AnalyteKey, current: number, previous: number, c: ColorTokens) {
  if (current === previous) return c.textMuted;
  if (key === 'nitrate_no3' || key === 'nitrite_no2') {
    // Lower is better for nitrogenous compounds.
    return current < previous ? c.success : c.warning;
  }
  return c.primary;
}

function issueStatusColor(status: ReadingStatus, c: ColorTokens) {
  if (status === 'Danger') return c.danger;
  if (status === 'Caution') return c.warning;
  return c.success;
}

function issueMapByKey(issues: ReadingIssue[]) {
  return issues.reduce<Record<string, ReadingIssue>>((result, issue) => {
    result[issue.analyteKey] = issue;
    return result;
  }, {});
}

function tinted(color: string, alpha = 0.1) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${a}`;
}

export function ReadingValueGrid({
  test,
  ranges,
}: {
  test: WaterTest;
  ranges: AnalyteRange[];
}) {
  const theme = useTheme();
  const issues = issueMapByKey(getReadingIssues(test, ranges));

  return (
    <View style={[styles.grid, { gap: theme.spacing.sm }]}>
      {readingKeys.map((key) => {
        const issue = issues[key];
        const accentColor = issue ? issueStatusColor(issue.status, theme.colors) : theme.colors.accent;
        const tone = issue ? accentColor : theme.colors.text;

        return (
          <View
            key={key}
            style={[
              styles.valueChip,
              {
                backgroundColor: issue ? tinted(accentColor, 0.1) : theme.colors.surfaceMuted,
                borderColor: issue ? accentColor : theme.colors.border,
                borderRadius: theme.radius.md,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`${ANALYTE_LABELS[key]} ${formatValue(getValue(test, key))}`}>
            <Text
              style={[
                theme.typography.caption,
                { color: issue ? accentColor : theme.colors.textMuted },
              ]}>
              {ANALYTE_LABELS[key]}
            </Text>
            <Text
              style={[
                theme.typography.titleMd,
                { color: tone, marginTop: 2, fontVariant: ['tabular-nums'] },
              ]}
              numberOfLines={1}>
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
  const theme = useTheme();
  const issues = getReadingIssues(test, ranges);

  return (
    <View
      style={[
        styles.insight,
        {
          backgroundColor: theme.colors.surfaceAccent,
          borderColor: theme.colors.borderAccent,
          borderRadius: theme.radius.md,
          gap: theme.spacing.xs,
          padding: theme.spacing.md,
        },
      ]}>
      <Text style={[theme.typography.titleSm, { color: theme.colors.text }]}>
        {getStatusSummary(test, ranges)}
      </Text>
      {issues.slice(1, 3).map((issue) => (
        <Text
          key={issue.analyteKey}
          style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
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
  const theme = useTheme();
  if (!previousTest) return null;

  const trends = trendKeys
    .map((key) => {
      const current = getValue(test, key);
      const previous = getValue(previousTest, key);
      if (current === null || previous === null) return null;
      return { key, current, previous };
    })
    .filter((trend): trend is { key: AnalyteKey; current: number; previous: number } => trend !== null);

  if (trends.length === 0) return null;

  return (
    <View style={[styles.trendRow, { gap: theme.spacing.sm }]}>
      <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Since previous</Text>
      {trends.map((trend) => {
        const color = getTrendTone(trend.key, trend.current, trend.previous, theme.colors);
        return (
          <View
            key={trend.key}
            style={[
              styles.trendChip,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.pill,
                gap: 5,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: 4,
              },
            ]}>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {ANALYTE_LABELS[trend.key]}
            </Text>
            <Text
              style={[theme.typography.caption, { color, fontVariant: ['tabular-nums'] }]}>
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
  },
  valueChip: {
    borderWidth: 1,
    minWidth: 88,
  },
  insight: {
    borderWidth: 1,
  },
  trendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trendChip: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
});
