import type { AnalyteKey, AnalyteRange, WaterTest } from './database';

export type ReadingStatus = 'Good' | 'Caution' | 'Danger';

export const ANALYTE_LABELS: Record<AnalyteKey, string> = {
  nitrate_no3: 'NO3 nitrate',
  nitrite_no2: 'NO2 nitrite',
  ph: 'pH',
  kh: 'KH',
  gh: 'GH',
};

const analyteKeys: AnalyteKey[] = ['nitrite_no2', 'nitrate_no3', 'ph', 'kh', 'gh'];

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

function getDefaultStatus(analyteKey: AnalyteKey, value: number | null) {
  if (analyteKey === 'nitrite_no2') {
    return getNitriteStatus(value);
  }

  if (analyteKey === 'nitrate_no3') {
    return getNitrateStatus(value);
  }

  if (analyteKey === 'ph') {
    return getPhStatus(value);
  }

  return 'Good';
}

function getAnalyteStatus(
  analyteKey: AnalyteKey,
  value: number | null,
  range: AnalyteRange | undefined,
  hasRanges: boolean,
) {
  return hasRanges ? getRangeStatus(analyteKey, value, range) : getDefaultStatus(analyteKey, value);
}

function getTestValue(test: WaterTest, key: AnalyteKey) {
  return test[key];
}

function formatValue(value: number | null) {
  return value === null ? '-' : String(value);
}

function formatRange(range: AnalyteRange | undefined, analyteKey: AnalyteKey) {
  if (!range) {
    if (analyteKey === 'nitrite_no2') {
      return '0';
    }

    if (analyteKey === 'nitrate_no3') {
      return '0-40';
    }

    if (analyteKey === 'ph') {
      return '6.5-8';
    }

    return 'not set';
  }

  if (range.low_value === null && range.high_value === null) {
    return 'not set';
  }

  if (range.low_value === null) {
    return `up to ${range.high_value}`;
  }

  if (range.high_value === null) {
    return `at least ${range.low_value}`;
  }

  return `${range.low_value}-${range.high_value}`;
}

export type ReadingIssue = {
  analyteKey: AnalyteKey;
  label: string;
  value: number;
  status: ReadingStatus;
  message: string;
};

export function getReadingIssues(test: WaterTest | null, ranges: AnalyteRange[] = []) {
  if (!test) {
    return [];
  }

  const rangeMap = ranges.reduce<Record<string, AnalyteRange>>((result, range) => {
    result[range.analyte_key] = range;

    return result;
  }, {});
  const hasRanges = ranges.length > 0;

  return analyteKeys.reduce<ReadingIssue[]>((issues, analyteKey) => {
    const value = getTestValue(test, analyteKey);
    const status = getAnalyteStatus(analyteKey, value, rangeMap[analyteKey], hasRanges);

    if (value === null || status === 'Good') {
      return issues;
    }

    const label = ANALYTE_LABELS[analyteKey];

    issues.push({
      analyteKey,
      label,
      value,
      status,
      message: `${label} is ${formatValue(value)}. Target: ${formatRange(rangeMap[analyteKey], analyteKey)}.`,
    });

    return issues;
  }, []);
}

export function getStatusSummary(test: WaterTest | null, ranges: AnalyteRange[] = []) {
  const issues = getReadingIssues(test, ranges);

  if (!test) {
    return 'No readings logged yet.';
  }

  if (issues.length === 0) {
    return 'All measured values are within target.';
  }

  return issues[0].message;
}

export function getOverallStatus(test: WaterTest | null, ranges: AnalyteRange[] = []): ReadingStatus {
  if (!test) {
    return 'Good';
  }

  const rangeMap = ranges.reduce<Record<string, AnalyteRange>>((result, range) => {
    result[range.analyte_key] = range;

    return result;
  }, {});
  const statuses = analyteKeys.map((analyteKey) =>
    getAnalyteStatus(analyteKey, getTestValue(test, analyteKey), rangeMap[analyteKey], ranges.length > 0),
  );

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
