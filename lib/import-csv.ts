import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { importWaterTests, type ImportedWaterTest } from './database';

const requiredHeaders = [
  'tank_name',
  'tested_at',
  'nitrate_no3',
  'nitrite_no2',
  'ph',
  'kh',
  'gh',
  'did_water_change',
  'notes',
];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += character;
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((value) => value.trim()));
}

function parseOptionalNumber(value: string | undefined) {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number "${trimmed}"`);
  }

  return parsed;
}

function parseWaterChange(value: string | undefined) {
  const normalized = value?.trim().toLocaleLowerCase() ?? '';

  return normalized === '1' || normalized === 'true' || normalized === 'yes' ? 1 : 0;
}

function rowToObject(headers: string[], row: string[]) {
  return headers.reduce<Record<string, string>>((result, header, index) => {
    result[header] = row[index] ?? '';

    return result;
  }, {});
}

export function csvToWaterTests(csvText: string) {
  const rows = parseCsv(csvText);
  const headers = rows[0]?.map((header) => header.trim()) ?? [];
  const missingHeader = requiredHeaders.find((header) => !headers.includes(header));

  if (rows.length < 2) {
    throw new Error('This CSV does not contain any water test rows.');
  }

  if (missingHeader) {
    throw new Error(`This CSV is missing the ${missingHeader} column.`);
  }

  return rows.slice(1).map((row, index): ImportedWaterTest => {
    const record = rowToObject(headers, row);
    const testedAt = record.tested_at?.trim();

    if (!testedAt || Number.isNaN(new Date(testedAt).getTime())) {
      throw new Error(`Row ${index + 2} has an invalid test date.`);
    }

    return {
      tank_name: record.tank_name?.trim() || 'Imported Tank',
      tested_at: new Date(testedAt).toISOString(),
      nitrate_no3: parseOptionalNumber(record.nitrate_no3),
      nitrite_no2: parseOptionalNumber(record.nitrite_no2),
      ph: parseOptionalNumber(record.ph),
      kh: parseOptionalNumber(record.kh),
      gh: parseOptionalNumber(record.gh),
      did_water_change: parseWaterChange(record.did_water_change),
      notes: record.notes?.trim() || null,
    };
  });
}

export async function pickAndImportWaterTestsCsv() {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
  });

  if (result.canceled) {
    return null;
  }

  const file = new File(result.assets[0].uri);
  const csvText = await file.text();
  const rows = csvToWaterTests(csvText);

  return importWaterTests(rows);
}
