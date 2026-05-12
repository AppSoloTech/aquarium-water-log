import type { NewWaterTest } from './database';

export type NumberField = 'nitrate_no3' | 'nitrite_no2' | 'ph' | 'kh' | 'gh';

export type NumberInputs = Record<NumberField, string>;

export const numberFields: {
  key: NumberField;
  label: string;
  placeholder: string;
  quickValues: number[];
}[] = [
  { key: 'nitrate_no3', label: 'NO3 nitrate', placeholder: 'Example: 20', quickValues: [0, 5, 10, 20, 40, 80] },
  { key: 'nitrite_no2', label: 'NO2 nitrite', placeholder: 'Example: 0', quickValues: [0, 0.25, 0.5, 1] },
  { key: 'ph', label: 'pH', placeholder: 'Example: 7.2', quickValues: [6.6, 6.8, 7, 7.2, 7.6, 8] },
  { key: 'kh', label: 'KH', placeholder: 'Example: 4', quickValues: [3, 4, 6, 8, 10] },
  { key: 'gh', label: 'GH', placeholder: 'Example: 8', quickValues: [4, 6, 8, 10, 12] },
];

export function blankNumbers(): NumberInputs {
  return {
    nitrate_no3: '',
    nitrite_no2: '',
    ph: '',
    kh: '',
    gh: '',
  };
}

export function valueToInput(value: number | null) {
  return value === null ? '' : String(value);
}

export function parseOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const numberValue = Number(trimmed);

  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

export function parseWaterTestNumbers(numbers: NumberInputs): Pick<
  NewWaterTest,
  'nitrate_no3' | 'nitrite_no2' | 'ph' | 'kh' | 'gh'
> {
  return {
    nitrate_no3: parseOptionalNumber(numbers.nitrate_no3),
    nitrite_no2: parseOptionalNumber(numbers.nitrite_no2),
    ph: parseOptionalNumber(numbers.ph),
    kh: parseOptionalNumber(numbers.kh),
    gh: parseOptionalNumber(numbers.gh),
  };
}
