import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { WaterTest } from './database';

const csvHeaders = [
  'id',
  'tank_id',
  'tank_name',
  'tested_at',
  'nitrate_no3',
  'nitrite_no2',
  'ph',
  'kh',
  'gh',
  'did_water_change',
  'notes',
  'created_at',
];

function csvCell(value: string | number | null) {
  if (value === null) {
    return '';
  }

  const text = String(value);

  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function waterTestsToCsv(tests: WaterTest[]) {
  const rows = tests.map((test) =>
    [
      test.id,
      test.tank_id,
      test.tank_name,
      test.tested_at,
      test.nitrate_no3,
      test.nitrite_no2,
      test.ph,
      test.kh,
      test.gh,
      test.did_water_change,
      test.notes,
      test.created_at,
    ]
      .map(csvCell)
      .join(','),
  );

  return [csvHeaders.join(','), ...rows].join('\n');
}

export async function shareWaterTestsCsv(tests: WaterTest[]) {
  const isAvailable = await Sharing.isAvailableAsync();

  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  const file = new File(Paths.cache, `aquarium-water-log-${Date.now()}.csv`);
  file.create({ overwrite: true });
  file.write(waterTestsToCsv(tests));

  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Export aquarium water tests',
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
