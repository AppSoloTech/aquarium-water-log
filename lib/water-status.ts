import type { AnalyteKey, AnalyteRange, WaterTest } from './database';

export type ReadingStatus = 'Good' | 'Caution' | 'Danger';

const rank: Record<ReadingStatus, number> = {
  Good: 0,
  Caution: 1,
  Danger: 2,
};

export function getNitriteStatus(value: number | null): ReadingStatus {
  if (value === null) {
    return 'Good';
  }

  return value === 0 ? 'Good' : 'Danger';
}

export function getNitrateStatus(value: number | null): ReadingStatus {
  if (value === null) {
    return 'Good';
  }

  if (value > 80) {
    return 'Danger';
  }

  if (value > 40) {
    return 'Caution';
  }

  return 'Good';
}

export function getPhStatus(value: number | null): ReadingStatus {
  if (value === null) {
    return 'Good';
  }

  return value >= 6.5 && value <= 8 ? 'Good' : 'Caution';
}

function getRangeStatus(
  analyteKey: AnalyteKey,
  value: number | null,
  range: AnalyteRange | undefined,
): ReadingStatus {
  if (value === null || !range) {
    return 'Good';
  }

  if (range.low_value !== null && value < range.low_value) {
    return 'Caution';
  }

  if (range.high_value !== null && value > range.high_value) {
    if (analyteKey === 'nitrite_no2' && range.high_value === 0) {
      return 'Danger';
    }

    if (analyteKey === 'nitrate_no3' && range.high_value > 0 && value > range.high_value * 2) {
      return 'Danger';
    }

    return 'Caution';
  }

  return 'Good';
}

export function getOverallStatus(test: WaterTest | null, ranges: AnalyteRange[] = []): ReadingStatus {
  if (!test) {
    return 'Good';
  }

  const rangeMap = ranges.reduce<Record<string, AnalyteRange>>((result, range) => {
    result[range.analyte_key] = range;

    return result;
  }, {});
  const statuses =
    ranges.length > 0
      ? [
          getRangeStatus('nitrite_no2', test.nitrite_no2, rangeMap.nitrite_no2),
          getRangeStatus('nitrate_no3', test.nitrate_no3, rangeMap.nitrate_no3),
          getRangeStatus('ph', test.ph, rangeMap.ph),
          getRangeStatus('kh', test.kh, rangeMap.kh),
          getRangeStatus('gh', test.gh, rangeMap.gh),
        ]
      : [getNitriteStatus(test.nitrite_no2), getNitrateStatus(test.nitrate_no3), getPhStatus(test.ph)];

  return statuses.reduce<ReadingStatus>(
    (worst, current) => (rank[current] > rank[worst] ? current : worst),
    'Good',
  );
}

export function getStatusColor(status: ReadingStatus) {
  if (status === 'Danger') {
    return '#b42318';
  }

  if (status === 'Caution') {
    return '#b54708';
  }

  return '#047857';
}
