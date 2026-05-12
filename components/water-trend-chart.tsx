import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { AquariumTheme } from '@/constants/aquarium-theme';
import type { AnalyteKey, AnalyteRange } from '@/lib/database';
import { ANALYTE_LABELS } from '@/lib/water-status';

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
  if (Math.abs(value) >= 10) {
    return String(Math.round(value));
  }

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
  if (points.length < 2) {
    return null;
  }

  const count = points.length;
  const sumX = points.reduce((sum, _point, index) => sum + index, 0);
  const sumY = points.reduce((sum, point) => sum + point.value, 0);
  const sumXY = points.reduce((sum, point, index) => sum + index * point.value, 0);
  const sumXX = points.reduce((sum, _point, index) => sum + index * index, 0);
  const denominator = count * sumXX - sumX * sumX;

  if (denominator === 0) {
    return null;
  }

  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;

  return {
    start: intercept,
    end: slope * (count - 1) + intercept,
    slope,
  };
}

function paddedDomain(points: TrendPoint[], range?: AnalyteRange) {
  const values = points.map((point) => point.value);

  if (range?.low_value !== null && range?.low_value !== undefined) {
    values.push(range.low_value);
  }

  if (range?.high_value !== null && range?.high_value !== undefined) {
    values.push(range.high_value);
  }

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
  const [width, setWidth] = useState(0);
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const sortedPoints = useMemo(
    () =>
      [...points]
        .filter((point) => Number.isFinite(point.value))
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
    trend && sortedPoints.length > 1
      ? { x: labelWidth, y: valueToY(trend.start) }
      : null;
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
    sortedPoints.find((point) => point.id === selectedPointId) ??
    sortedPoints[sortedPoints.length - 1] ??
    null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{ANALYTE_LABELS[analyteKey]}</Text>
          <Text style={styles.subtitle}>
            {sortedPoints.length} {sortedPoints.length === 1 ? 'reading' : 'readings'}
          </Text>
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendMark, { backgroundColor: AquariumTheme.primary }]} />
            <Text style={styles.legendText}>Reading</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendMark, { backgroundColor: AquariumTheme.coral }]} />
            <Text style={styles.legendText}>{trendLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.chart} onLayout={onLayout}>
        {width > 0 && sortedPoints.length > 0 ? (
          <>
            {[domain.max, (domain.max + domain.min) / 2, domain.min].map((value) => {
              const y = valueToY(value);

              return (
                <View key={value} style={[styles.gridLine, { top: y }]}>
                  <Text style={styles.axisLabel}>{formatValue(value)}</Text>
                  <View style={styles.gridRule} />
                </View>
              );
            })}

            {range?.low_value !== null && range?.low_value !== undefined ? (
              <View style={[styles.targetLine, { top: valueToY(range.low_value) }]}>
                <Text style={styles.targetLabel}>Low</Text>
              </View>
            ) : null}

            {range?.high_value !== null && range?.high_value !== undefined ? (
              <View style={[styles.targetLine, { top: valueToY(range.high_value) }]}>
                <Text style={styles.targetLabel}>High</Text>
              </View>
            ) : null}

            {positions.slice(0, -1).map((position, index) => (
              <View
                key={`${sortedPoints[index].id}-${sortedPoints[index + 1].id}`}
                style={[
                  styles.segment,
                  lineStyle(position, positions[index + 1], AquariumTheme.primary),
                ]}
              />
            ))}

            {trendStart && trendEnd ? (
              <View
                style={[
                  styles.segment,
                  styles.trendLine,
                  lineStyle(trendStart, trendEnd, AquariumTheme.coral, 2),
                ]}
              />
            ) : null}

            {positions.map((position, index) => (
              <Pressable
                key={sortedPoints[index].id}
                onPress={() => setSelectedPointId(sortedPoints[index].id)}
                style={[
                  styles.dot,
                  sortedPoints[index].didWaterChange ? styles.waterChangeDot : null,
                  selectedPoint?.id === sortedPoints[index].id ? styles.selectedDot : null,
                  { left: position.x - 6, top: position.y - 6 },
                ]}>
                <Text style={styles.dotLabel}>{formatValue(sortedPoints[index].value)}</Text>
              </Pressable>
            ))}

            {sortedPoints.length > 0 ? (
              <>
                <Text style={[styles.dateLabel, { left: labelWidth, bottom: 4 }]}>
                  {formatShortDate(sortedPoints[0].testedAt)}
                </Text>
                <Text style={[styles.dateLabel, styles.lastDateLabel, { right: rightPadding, bottom: 4 }]}>
                  {formatShortDate(sortedPoints[sortedPoints.length - 1].testedAt)}
                </Text>
              </>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No chartable values yet.</Text>
          </View>
        )}
      </View>

      {selectedPoint ? (
        <View style={styles.detailPanel}>
          <View style={styles.detailTextBlock}>
            <Text style={styles.detailTitle}>
              {ANALYTE_LABELS[analyteKey]} {formatValue(selectedPoint.value)}
            </Text>
            <Text style={styles.detailText}>{selectedPoint.tankName}</Text>
            <Text style={styles.detailText}>{formatLongDate(selectedPoint.testedAt)}</Text>
            <Text style={styles.detailText}>
              Water change: {selectedPoint.didWaterChange ? 'Yes' : 'No'}
            </Text>
          </View>
          {onEditPoint ? (
            <Pressable style={styles.editButton} onPress={() => onEditPoint(selectedPoint.id)}>
              <Text style={styles.editButtonText}>Edit Test</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text style={styles.footerText}>
          Filled dots mark readings with a water change.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  title: {
    color: AquariumTheme.primaryDark,
    fontSize: 19,
    fontWeight: '900',
  },
  subtitle: {
    color: AquariumTheme.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  legend: {
    alignItems: 'flex-end',
    gap: 5,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendMark: {
    borderRadius: 8,
    height: 8,
    width: 18,
  },
  legendText: {
    color: AquariumTheme.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  chart: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.borderSoft,
    borderRadius: 8,
    borderWidth: 1,
    height: chartHeight,
    overflow: 'hidden',
  },
  gridLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    left: 0,
    position: 'absolute',
    right: rightPadding,
  },
  axisLabel: {
    color: AquariumTheme.muted,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
    width: labelWidth - 8,
  },
  gridRule: {
    backgroundColor: AquariumTheme.borderSoft,
    flex: 1,
    height: 1,
  },
  targetLine: {
    borderColor: AquariumTheme.teal,
    borderStyle: 'dashed',
    borderTopWidth: 1,
    left: labelWidth,
    position: 'absolute',
    right: rightPadding,
  },
  targetLabel: {
    backgroundColor: AquariumTheme.surfaceBlue,
    color: AquariumTheme.teal,
    fontSize: 10,
    fontWeight: '900',
    left: 4,
    paddingHorizontal: 4,
    position: 'absolute',
    top: -9,
  },
  segment: {
    borderRadius: 8,
    position: 'absolute',
  },
  trendLine: {
    opacity: 0.85,
  },
  dot: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: AquariumTheme.primary,
    borderRadius: 8,
    borderWidth: 2,
    height: 12,
    justifyContent: 'center',
    position: 'absolute',
    width: 12,
  },
  waterChangeDot: {
    backgroundColor: AquariumTheme.primary,
  },
  selectedDot: {
    borderColor: AquariumTheme.coral,
    borderWidth: 3,
    height: 16,
    width: 16,
  },
  dotLabel: {
    color: AquariumTheme.text,
    fontSize: 10,
    fontWeight: '900',
    position: 'absolute',
    top: -20,
  },
  dateLabel: {
    color: AquariumTheme.muted,
    fontSize: 11,
    fontWeight: '800',
    position: 'absolute',
  },
  lastDateLabel: {
    textAlign: 'right',
  },
  emptyChart: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    color: AquariumTheme.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  footerText: {
    color: AquariumTheme.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  detailPanel: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.surfaceMint,
    borderColor: AquariumTheme.borderMint,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  detailTextBlock: {
    flex: 1,
    gap: 2,
  },
  detailTitle: {
    color: AquariumTheme.text,
    fontSize: 16,
    fontWeight: '900',
  },
  detailText: {
    color: AquariumTheme.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  editButton: {
    backgroundColor: AquariumTheme.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
