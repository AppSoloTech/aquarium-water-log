import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'aquarium-water-log.db';
export const DEFAULT_TANK_ID_KEY = 'default_tank_id';
export const DEFAULT_TANK_NAME_KEY = 'default_tank_name';
export const REMINDER_FREQUENCY_KEY = 'reminder_frequency_days';
export const REMINDER_INTERVAL_KEY = 'reminder_interval_value';
export const REMINDER_MODE_KEY = 'reminder_mode';
export const REMINDER_TANK_ID_KEY = 'reminder_tank_id';

export type AnalyteKey = 'nitrate_no3' | 'nitrite_no2' | 'ph' | 'kh' | 'gh';

export type AnalyteRange = {
  analyte_key: AnalyteKey;
  low_value: number | null;
  high_value: number | null;
};

export const DEFAULT_ANALYTE_RANGES: Record<AnalyteKey, AnalyteRange> = {
  nitrate_no3: { analyte_key: 'nitrate_no3', low_value: 0, high_value: 40 },
  nitrite_no2: { analyte_key: 'nitrite_no2', low_value: 0, high_value: 0 },
  ph: { analyte_key: 'ph', low_value: 6.5, high_value: 8 },
  kh: { analyte_key: 'kh', low_value: null, high_value: null },
  gh: { analyte_key: 'gh', low_value: null, high_value: null },
};

export type Tank = {
  id: number;
  name: string;
  notes: string | null;
  created_at: string;
};

export type TankSummary = Tank & {
  test_count: number;
  latest_tested_at: string | null;
};

export type NotificationReminder = {
  id: number;
  tank_id: number;
  tank_name: string;
  mode: 'hours' | 'days';
  interval_value: number;
  notification_id: string;
  created_at: string;
};

export type WaterTest = {
  id: number;
  tank_id: number | null;
  tank_name: string;
  tested_at: string;
  nitrate_no3: number | null;
  nitrite_no2: number | null;
  ph: number | null;
  kh: number | null;
  gh: number | null;
  did_water_change: number;
  notes: string | null;
  created_at: string;
};

export type NewWaterTest = {
  tank_id: number;
  tested_at: string;
  nitrate_no3: number | null;
  nitrite_no2: number | null;
  ph: number | null;
  kh: number | null;
  gh: number | null;
  did_water_change: number;
  notes: string | null;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializedPromise: Promise<void> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

async function ensureColumn(db: SQLite.SQLiteDatabase, tableName: string, columnName: string, sql: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  const hasColumn = columns.some((column) => column.name === columnName);

  if (!hasColumn) {
    await db.execAsync(sql);
  }
}

async function saveSettingRaw(db: SQLite.SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    `INSERT INTO app_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

async function loadSettingRaw(db: SQLite.SQLiteDatabase, key: string) {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key,
  );

  return row?.value ?? null;
}

async function ensureDefaultTank(db: SQLite.SQLiteDatabase) {
  const existing = await db.getFirstAsync<Tank>('SELECT * FROM tanks ORDER BY id LIMIT 1');

  if (existing) {
    return existing.id;
  }

  const savedName = await loadSettingRaw(db, DEFAULT_TANK_NAME_KEY);
  const name = savedName?.trim() || 'My Tank';
  const result = await db.runAsync(
    'INSERT INTO tanks (name, notes, created_at) VALUES (?, ?, ?)',
    name,
    null,
    new Date().toISOString(),
  );

  await saveSettingRaw(db, DEFAULT_TANK_ID_KEY, String(result.lastInsertRowId));

  return result.lastInsertRowId;
}

async function migrateExistingTankNames(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<{ tank_name: string }>(
    `SELECT DISTINCT TRIM(COALESCE(tank_name, '')) AS tank_name
     FROM water_tests
     WHERE tank_id IS NULL AND TRIM(COALESCE(tank_name, '')) != ''`,
  );

  for (const row of rows) {
    await db.runAsync(
      'INSERT OR IGNORE INTO tanks (name, notes, created_at) VALUES (?, ?, ?)',
      row.tank_name,
      null,
      new Date().toISOString(),
    );
  }

  const defaultTankId = await ensureDefaultTank(db);

  await db.runAsync(`
    UPDATE water_tests
    SET tank_id = (
      SELECT id
      FROM tanks
      WHERE tanks.name = TRIM(COALESCE(water_tests.tank_name, ''))
      LIMIT 1
    )
    WHERE tank_id IS NULL
      AND TRIM(COALESCE(tank_name, '')) != ''
  `);

  await db.runAsync('UPDATE water_tests SET tank_id = ? WHERE tank_id IS NULL', defaultTankId);
}

async function initDatabaseOnce() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tanks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS water_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tank_id INTEGER,
      tank_name TEXT,
      tested_at TEXT,
      nitrate_no3 REAL,
      nitrite_no2 REAL,
      ph REAL,
      kh REAL,
      gh REAL,
      did_water_change INTEGER,
      notes TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS analyte_ranges (
      tank_id INTEGER NOT NULL,
      analyte_key TEXT NOT NULL,
      low_value REAL,
      high_value REAL,
      PRIMARY KEY (tank_id, analyte_key)
    );

    CREATE TABLE IF NOT EXISTS notification_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tank_id INTEGER NOT NULL,
      tank_name TEXT NOT NULL,
      mode TEXT NOT NULL,
      interval_value INTEGER NOT NULL,
      notification_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await ensureColumn(db, 'water_tests', 'tank_id', 'ALTER TABLE water_tests ADD COLUMN tank_id INTEGER');
  await migrateExistingTankNames(db);
}

export async function initDatabase() {
  if (!initializedPromise) {
    initializedPromise = initDatabaseOnce();
  }

  return initializedPromise;
}

export async function createTank(name: string, notes: string | null = null) {
  await initDatabase();
  const db = await getDatabase();
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error('Tank name is required.');
  }

  const result = await db.runAsync(
    'INSERT INTO tanks (name, notes, created_at) VALUES (?, ?, ?)',
    cleanName,
    notes?.trim() || null,
    new Date().toISOString(),
  );

  const defaultTankId = await loadSetting(DEFAULT_TANK_ID_KEY);

  if (!defaultTankId) {
    await saveSetting(DEFAULT_TANK_ID_KEY, String(result.lastInsertRowId));
  }

  return result.lastInsertRowId;
}

export async function getTanks() {
  await initDatabase();
  const db = await getDatabase();

  return db.getAllAsync<Tank>('SELECT * FROM tanks ORDER BY name COLLATE NOCASE ASC');
}

export async function getTankSummaries() {
  await initDatabase();
  const db = await getDatabase();

  return db.getAllAsync<TankSummary>(`
    SELECT
      tanks.*,
      COUNT(water_tests.id) AS test_count,
      MAX(water_tests.tested_at) AS latest_tested_at
    FROM tanks
    LEFT JOIN water_tests ON water_tests.tank_id = tanks.id
    GROUP BY tanks.id
    ORDER BY tanks.name COLLATE NOCASE ASC
  `);
}

export async function getTank(id: number) {
  await initDatabase();
  const db = await getDatabase();

  return db.getFirstAsync<Tank>('SELECT * FROM tanks WHERE id = ?', id);
}

export async function updateTank(id: number, name: string, notes: string | null = null) {
  await initDatabase();
  const db = await getDatabase();
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error('Tank name is required.');
  }

  await db.runAsync(
    'UPDATE tanks SET name = ?, notes = ? WHERE id = ?',
    cleanName,
    notes?.trim() || null,
    id,
  );
  await db.runAsync('UPDATE water_tests SET tank_name = ? WHERE tank_id = ?', cleanName, id);
  await db.runAsync('UPDATE notification_reminders SET tank_name = ? WHERE tank_id = ?', cleanName, id);
}

export async function getDefaultTankId() {
  await initDatabase();
  const savedId = await loadSetting(DEFAULT_TANK_ID_KEY);

  if (savedId) {
    const tank = await getTank(Number(savedId));

    if (tank) {
      return tank.id;
    }
  }

  const tanks = await getTanks();
  const firstTank = tanks[0] ?? null;

  if (firstTank) {
    await saveSetting(DEFAULT_TANK_ID_KEY, String(firstTank.id));
  }

  return firstTank?.id ?? null;
}

export async function setDefaultTankId(id: number) {
  await saveSetting(DEFAULT_TANK_ID_KEY, String(id));
}

export async function deleteTank(id: number) {
  await initDatabase();
  const db = await getDatabase();
  const countRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM water_tests WHERE tank_id = ?',
    id,
  );
  const reminderCountRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM notification_reminders WHERE tank_id = ?',
    id,
  );

  if ((countRow?.count ?? 0) > 0) {
    throw new Error('Tanks with saved tests cannot be deleted.');
  }

  if ((reminderCountRow?.count ?? 0) > 0) {
    throw new Error('Tanks with active notifications cannot be deleted.');
  }

  await db.runAsync('DELETE FROM tanks WHERE id = ?', id);
  await db.runAsync('DELETE FROM analyte_ranges WHERE tank_id = ?', id);

  const defaultTankId = await loadSetting(DEFAULT_TANK_ID_KEY);

  if (defaultTankId === String(id)) {
    const nextTank = await db.getFirstAsync<Tank>('SELECT * FROM tanks ORDER BY name LIMIT 1');
    await saveSetting(DEFAULT_TANK_ID_KEY, nextTank ? String(nextTank.id) : '');
  }
}

export async function getAnalyteRanges(tankId: number) {
  await initDatabase();
  const db = await getDatabase();
  const savedRanges = await db.getAllAsync<AnalyteRange>(
    'SELECT analyte_key, low_value, high_value FROM analyte_ranges WHERE tank_id = ?',
    tankId,
  );

  return Object.values(DEFAULT_ANALYTE_RANGES).map((defaultRange) => {
    const savedRange = savedRanges.find((range) => range.analyte_key === defaultRange.analyte_key);

    return savedRange ?? defaultRange;
  });
}

export async function saveAnalyteRange(tankId: number, range: AnalyteRange) {
  await initDatabase();
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO analyte_ranges (tank_id, analyte_key, low_value, high_value)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tank_id, analyte_key)
     DO UPDATE SET low_value = excluded.low_value, high_value = excluded.high_value`,
    tankId,
    range.analyte_key,
    range.low_value,
    range.high_value,
  );
}

export async function createNotificationReminder({
  tankId,
  tankName,
  mode,
  intervalValue,
  notificationId,
}: {
  tankId: number;
  tankName: string;
  mode: 'hours' | 'days';
  intervalValue: number;
  notificationId: string;
}) {
  await initDatabase();
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO notification_reminders (
      tank_id,
      tank_name,
      mode,
      interval_value,
      notification_id,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    tankId,
    tankName,
    mode,
    intervalValue,
    notificationId,
    new Date().toISOString(),
  );
}

export async function getNotificationReminders() {
  await initDatabase();
  const db = await getDatabase();

  return db.getAllAsync<NotificationReminder>(`
    SELECT
      notification_reminders.*,
      COALESCE(tanks.name, notification_reminders.tank_name) AS tank_name
    FROM notification_reminders
    LEFT JOIN tanks ON tanks.id = notification_reminders.tank_id
    ORDER BY datetime(notification_reminders.created_at) DESC, notification_reminders.id DESC
  `);
}

export async function getNotificationRemindersForTank(tankId: number) {
  await initDatabase();
  const db = await getDatabase();

  return db.getAllAsync<NotificationReminder>(
    'SELECT * FROM notification_reminders WHERE tank_id = ? ORDER BY id DESC',
    tankId,
  );
}

export async function deleteNotificationReminder(id: number) {
  await initDatabase();
  const db = await getDatabase();

  await db.runAsync('DELETE FROM notification_reminders WHERE id = ?', id);
}

export async function insertWaterTest(test: NewWaterTest) {
  await initDatabase();
  const db = await getDatabase();
  const tank = await getTank(test.tank_id);

  if (!tank) {
    throw new Error('Selected tank was not found.');
  }

  await db.runAsync(
    `INSERT INTO water_tests (
      tank_id,
      tank_name,
      tested_at,
      nitrate_no3,
      nitrite_no2,
      ph,
      kh,
      gh,
      did_water_change,
      notes,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    test.tank_id,
    tank.name,
    test.tested_at,
    test.nitrate_no3,
    test.nitrite_no2,
    test.ph,
    test.kh,
    test.gh,
    test.did_water_change,
    test.notes,
    new Date().toISOString(),
  );
}

export async function getWaterTest(id: number) {
  await initDatabase();
  const db = await getDatabase();

  return db.getFirstAsync<WaterTest>(
    `SELECT
      water_tests.*,
      COALESCE(tanks.name, water_tests.tank_name, 'Unnamed tank') AS tank_name
     FROM water_tests
     LEFT JOIN tanks ON tanks.id = water_tests.tank_id
     WHERE water_tests.id = ?`,
    id,
  );
}

export async function updateWaterTest(id: number, test: NewWaterTest) {
  await initDatabase();
  const db = await getDatabase();
  const tank = await getTank(test.tank_id);

  if (!tank) {
    throw new Error('Selected tank was not found.');
  }

  await db.runAsync(
    `UPDATE water_tests
     SET
      tank_id = ?,
      tank_name = ?,
      tested_at = ?,
      nitrate_no3 = ?,
      nitrite_no2 = ?,
      ph = ?,
      kh = ?,
      gh = ?,
      did_water_change = ?,
      notes = ?
     WHERE id = ?`,
    test.tank_id,
    tank.name,
    test.tested_at,
    test.nitrate_no3,
    test.nitrite_no2,
    test.ph,
    test.kh,
    test.gh,
    test.did_water_change,
    test.notes,
    id,
  );
}

export async function getAllWaterTests(tankId?: number | null) {
  await initDatabase();
  const db = await getDatabase();
  const whereClause = tankId ? 'WHERE water_tests.tank_id = ?' : '';
  const params = tankId ? [tankId] : [];

  return db.getAllAsync<WaterTest>(
    `SELECT
      water_tests.*,
      COALESCE(tanks.name, water_tests.tank_name, 'Unnamed tank') AS tank_name
     FROM water_tests
     LEFT JOIN tanks ON tanks.id = water_tests.tank_id
     ${whereClause}
     ORDER BY datetime(water_tests.tested_at) DESC, water_tests.id DESC`,
    params,
  );
}

export async function getLatestWaterTest(tankId?: number | null) {
  await initDatabase();
  const db = await getDatabase();
  const whereClause = tankId ? 'WHERE water_tests.tank_id = ?' : '';
  const params = tankId ? [tankId] : [];

  return db.getFirstAsync<WaterTest>(
    `SELECT
      water_tests.*,
      COALESCE(tanks.name, water_tests.tank_name, 'Unnamed tank') AS tank_name
     FROM water_tests
     LEFT JOIN tanks ON tanks.id = water_tests.tank_id
     ${whereClause}
     ORDER BY datetime(water_tests.tested_at) DESC, water_tests.id DESC
     LIMIT 1`,
    params,
  );
}

export async function getLatestWaterTestsByTank() {
  await initDatabase();
  const db = await getDatabase();

  return db.getAllAsync<WaterTest>(`
    SELECT
      water_tests.*,
      COALESCE(tanks.name, water_tests.tank_name, 'Unnamed tank') AS tank_name
    FROM water_tests
    LEFT JOIN tanks ON tanks.id = water_tests.tank_id
    WHERE water_tests.id IN (
      SELECT latest.id
      FROM water_tests AS latest
      WHERE latest.tank_id IS NOT NULL
        AND latest.id = (
          SELECT inner_tests.id
          FROM water_tests AS inner_tests
          WHERE inner_tests.tank_id = latest.tank_id
          ORDER BY datetime(inner_tests.tested_at) DESC, inner_tests.id DESC
          LIMIT 1
        )
    )
    ORDER BY tank_name COLLATE NOCASE ASC
  `);
}

export async function deleteWaterTest(id: number) {
  await initDatabase();
  const db = await getDatabase();

  await db.runAsync('DELETE FROM water_tests WHERE id = ?', id);
}

export async function deleteWaterTestsForTank(tankId: number) {
  await initDatabase();
  const db = await getDatabase();

  await db.runAsync('DELETE FROM water_tests WHERE tank_id = ?', tankId);
}

export async function resetLocalData() {
  await initDatabase();
  const db = await getDatabase();

  await db.execAsync(`
    DELETE FROM water_tests;
    DELETE FROM analyte_ranges;
    DELETE FROM notification_reminders;
    DELETE FROM app_settings;
    DELETE FROM tanks;
  `);

  const result = await db.runAsync(
    'INSERT INTO tanks (name, notes, created_at) VALUES (?, ?, ?)',
    'My Tank',
    null,
    new Date().toISOString(),
  );

  await saveSettingRaw(db, DEFAULT_TANK_ID_KEY, String(result.lastInsertRowId));
}

export async function saveSetting(key: string, value: string) {
  await initDatabase();
  const db = await getDatabase();

  await saveSettingRaw(db, key, value);
}

export async function loadSetting(key: string) {
  await initDatabase();
  const db = await getDatabase();

  return loadSettingRaw(db, key);
}
