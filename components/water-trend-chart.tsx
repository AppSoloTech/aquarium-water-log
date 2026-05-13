import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import type { AnalyteKey, AnalyteRange } from '@/lib/database';
import { ANALYTE_LABELS } from '@/lib/water-status';
import { useTheme, type ColorTokens } from '@/theme';

export type TrendPoint = {
  id: number;
  testedAt: string;
  tankName: string;
  value: number;
  didWaterChange: boolean;
};

type WaterTrendChartProps = {
  analyteKey: AnalyteKey;
  points: TrendPoint[];
  range?: AnalyteRange;
  onEditPoint?: (id: number) => void;
};

const chartHeight = 210;
const plotTop = 14;
const plotBottom = 34;
const labelWidth = 46;
const rightPadding = 10;
const lineThickness = 3;

function formatValue(value: number) {
  if (Math.abs(value) >= 10) return String(Math.round(value));
  return String(Number(value.toFixed(2)));
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTrend(points: TrendPoint[]) {
  if (points.length < 2) return null;

  const count = points.length;
  const sumX = points.reduce((sum, _p, i) => sum + i, 0);
  const sumY = points.reduce((sum, p) => sum + p.value, 0);
  const sumXY = points.reduce((sum, p, i) => sum + i * p.value, 0);
  const sumXX = points.reduce((sum, _p, i) => sum + i * i, 0);
  const denominator = count * sumXX - sumX * sumX;
  if (denominator === 0) return null;
  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;
  return { start: intercept, end: slope * (count - 1) + intercept, slope };
}

function paddedDomain(points: TrendPoint[], range?: AnalyteRange) {
  const values = points.map((p) => p.value);
  if (range?.low_value !== null && range?.low_value !== undefined) values.push(range.low_value);
  if (range?.high_value !== null && range?.high_value !== undefined) values.push(range.high_value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const padding = min === 0 ? 1 : Math.abs(min) * 0.2;
    return { min: min - padding, max: max + padding };
  }
  const padding = (max - min) * 0.18;
  return { min: Math.max(0, min - padding), max: max + padding };
}

function lineStyle(
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  thickness = lineThickness,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  return {
    backgroundColor: color,
    height: thickness,
    left: midX - length / 2,
    top: midY - thickness / 2,
    transform: [{ rotate: `${angle}rad` }],
    width: length,
  };
}

export function WaterTrendChart({ analyteKey, points, range, onEditPoint }: WaterTrendChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);

  const sortedPoints = useMemo(
    () =>
      [...points]
        .filter((p) => Number.isFinite(p.value))
        .sort((a, b) => new Date(a.testedAt).getTime() - new Date(b.testedAt).getTime()),
    [points],
  );
  const domain = sortedPoints.length > 0 ? paddedDomain(sortedPoints, range) : { min: 0, max: 1 };
  const trend = getTrend(sortedPoints);
  const plotHeight = chartHeight - plotTop - plotBottom;
  const plotWidth = Math.max(0, width - labelWidth - rightPadding);

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  function pointToPosition(point: TrendPoint, index: number) {
    const x =
      labelWidth +
      (sortedPoints.length <= 1 ? plotWidth / 2 : (index / (sortedPoints.length - 1)) * plotWidth);
    const ratio = (point.value - domain.min) / (domain.max - domain.min || 1);
    const y = plotTop + plotHeight - ratio * plotHeight;
    return { x, y };
  }

  function valueToY(value: number) {
    const ratio = (value - domain.min) / (domain.max - domain.min || 1);
    return plotTop + plotHeight - ratio * plotHeight;
  }

  const positions = sortedPoints.map(pointToPosition);
  const trendStart =
    trend && sortedPoints.length > 1 ? { x: labelWidth, y: valueToY(trend.start) } : null;
  const trendEnd =
    trend && sortedPoints.length > 1
      ? { x: labelWidth + plotWidth, y: valueToY(trend.end) }
      : null;
  const trendLabel =
    !trend || Math.abs(trend.slope) < 0.01
      ? 'Flat trend'
      : trend.slope > 0
        ? 'Trending up'
        : 'Trending down';
  const selectedPoint =
    sortedPoints.find((p) => p.id === selectedPointId) ??
    sortedPoints[sortedPoints.length - 1] ??
    null;

  const c = theme.colors;
  const trendColor = c.warning;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderRadius: theme.radius.lg,
          gap: theme.spacing.md,
          padding: theme.spacing.md,
        },
      ]}>
      <View style={styles.header}>
        <View>
          <Text style={[theme.typography.titleMd, { color: c.text }]}>{ANALYTE_LABELS[analyteKey]}</Text>
          <Text style={[theme.typography.bodySm, { color: c.textMuted }]}>
            {sortedPoints.length} {sortedPoints.length === 1 ? 'reading' : 'readings'}
          </Text>
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendMark, { backgroundColor: c.primary }]} />
            <Text style={[theme.typography.caption, { color: c.textMuted }]}>Reading</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendMark, { backgroundColor: trendColor }]} />
            <Text style={[theme.typography.caption, { color: c.textMuted }]}>{trendLabel}</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.chart,
          {
            backgroundColor: c.surfaceMuted,
            borderColor: c.border,
            borderRadius: theme.radius.md,
            height: chartHeight,
          },
        ]}
        onLayout={onLayout}>
        {width > 0 && sortedPoints.length > 0 ? (
          <>
            {[domain.max, (domain.max + domain.min) / 2, domain.min].map((value) => {
              const y = valueToY(value);
              return (
                <View key={value} style={[styles.gridLine, { top: y }]}>
                  <Text
                    style={[
                      theme.typography.caption,
                      styles.axisLabel,
                      { color: c.textMuted, width: labelWidth - 8 },
                    ]}>
                    {formatValue(value)}
                  </Text>
                  <View style={[styles.gridRule, { backgroundColor: c.border }]} />
                </View>
              );
            })}

            {range?.low_value !== null && range?.low_value !== undefined ? (
              <TargetLine label="Low" y={valueToY(range.low_value)} colors={c} />
            ) : null}

            {range?.high_value !== null && range?.high_value !== undefined ? (
              <TargetLine label="High" y={valueToY(range.high_value)} colors={c} />
            ) : null}

            {positions.slice(0, -1).map((position, index) => (
              <View
                key={`${sortedPoints[index].id}-${sortedPoints[index + 1].id}`}
                style={[styles.segment, lineStyle(position, positions[index + 1], c.primary)]}
              />
            ))}

            {trendStart && trendEnd ? (
              <View
                style={[styles.segment, styles.trendLine, lineStyle(trendStart, trendEnd, trendColor, 2)]}
              />
            ) : null}

            {positions.map((position, index) => {
              const point = sortedPoints[index];
              const isSelected = selectedPoint?.id === point.id;
              return (
                <Pressable
                  key={point.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${ANALYTE_LABELS[analyteKey]} ${formatValue(point.value)} on ${formatLongDate(point.testedAt)}`}
                  hitSlop={6}
                  onPress={() => setSelectedPointId(point.id)}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: point.didWaterChange ? c.primary : c.surface,
                      borderColor: isSelected ? trendColor : c.primary,
                      borderWidth: isSelected ? 3 : 2,
                      height: isSelected ? 16 : 12,
                      width: isSelected ? 16 : 12,
                      left: position.x - (isSelected ? 8 : 6),
                      top: position.y - (isSelected ? 8 : 6),
                    },
                  ]}>
                  <Text
                    style={[
                      theme.typography.caption,
                      styles.dotLabel,
                      { color: c.text },
                    ]}>
                    {formatValue(point.value)}
                  </Text>
                </Pressable>
              );
            })}

            <Text
              style={[
                theme.typography.caption,
                styles.dateLabel,
                { color: c.textMuted, left: labelWidth, bottom: 4 },
              ]}>
              {formatShortDate(sortedPoints[0].testedAt)}
            </Text>
            <Text
              style={[
                theme.typography.caption,
                styles.dateLabel,
                styles.lastDateLabel,
                { color: c.textMuted, right: rightPadding, bottom: 4 },
              ]}>
              {formatShortDate(sortedPoints[sortedPoints.length - 1].testedAt)}
            </Text>
          </>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={[theme.typography.bodyMd, { color: c.textMuted }]}>
              No chartable values yet.
            </Text>
          </View>
        )}
      </View>

      {selectedPoint ? (
        <View
          style={[
            styles.detailPanel,
            {
              backgroundColor: c.surfaceAccent,
              borderColor: c.borderAccent,
              borderRadius: theme.radius.md,
              gap: theme.spacing.md,
              padding: theme.spacing.md,
            },
          ]}>
          <View style={styles.detailTextBlock}>
            <Text style={[theme.typography.titleSm, { color: c.text }]}>
              {ANALYTE_LABELS[analyteKey]} {formatValue(selectedPoint.value)}
            </Text>
            <Text style={[theme.typography.bodySm, { color: c.textMuted }]}>{selectedPoint.tankName}</Text>
            <Text style={[theme.typography.bodySm, { color: c.textMuted }]}>
              {formatLongDate(selectedPoint.testedAt)}
            </Text>
            <Text style={[theme.typography.bodySm, { color: c.textMuted }]}>
              Water change: {selectedPoint.didWaterChange ? 'Yes' : 'No'}
            </Text>
          </View>
          {onEditPoint ? (
            <Button
              label="Edit"
              size="sm"
              leftIcon="pencil"
              onPress={() => onEditPoint(selectedPoint.id)}
              accessibilityLabel={`Edit ${ANALYTE_LABELS[analyteKey]} test`}
            />
          ) : null}
        </View>
      ) : (
        <Text style={[theme.typography.caption, { color: c.textMuted }]}>
          Filled dots mark readings with a water change.
        </Text>
      )}
    </View>
  );
}

function TargetLine({ label, y, colors }: { label: string; y: number; colors: ColorTokens }) {
  return (
    <View
      style={[
        styles.targetLine,
        {
          borderColor: colors.accent,
          left: labelWidth,
          right: rightPadding,
          top: y,
        },
      ]}>
      <Text
        style={[
          styles.targetLabel,
          { backgroundColor: colors.surfaceMuted, color: colors.accent },
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  legend: { alignItems: 'flex-end', gap: 5 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendMark: { borderRadius: 8, height: 8, width: 18 },
  chart: { borderWidth: 1, overflow: 'hidden' },
  gridLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    left: 0,
    position: 'absolute',
    right: rightPadding,
  },
  axisLabel: { textAlign: 'right' },
  gridRule: { flex: 1, height: 1 },
  targetLine: {
    borderStyle: 'dashed',
    borderTopWidth: 1,
    position: 'absolute',
  },
  targetLabel: {
    fontSize: 10,
    left: 4,
    paddingHorizontal: 4,
    position: 'absolute',
    top: -9,
  },
  segment: { borderRadius: 8, position: 'absolute' },
  trendLine: { opacity: 0.85 },
  dot: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    position: 'absolute',
  },
  dotLabel: { position: 'absolute', top: -20 },
  dateLabel: { position: 'absolute' },
  lastDateLabel: { textAlign: 'right' },
  emptyChart: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  detailPanel: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailTextBlock: { flex: 1, gap: 2 },
});
