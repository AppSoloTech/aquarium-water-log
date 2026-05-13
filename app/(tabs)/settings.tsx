import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TankDropdown } from '@/components/tank-dropdown';
import {
  Button,
  Card,
  Screen,
  Section,
  TextField,
  TileButton,
} from '@/components/ui';
import {
  DEFAULT_ANALYTE_RANGES,
  deleteWaterTestsForTank,
  getAnalyteRanges,
  getAllWaterTests,
  getDefaultTankId,
  getNotificationReminders,
  getTank,
  getTanks,
  resetLocalData,
  saveAnalyteRange,
  type AnalyteKey,
  type NotificationReminder,
  type Tank,
} from '@/lib/database';
import { shareWaterTestsCsv } from '@/lib/export-csv';
import { pickAndImportWaterTestsCsv } from '@/lib/import-csv';
import {
  createReminderNotification,
  DEFAULT_REMINDER_SCHEDULE,
  cancelAllReminderNotifications,
  cancelReminderNotification,
  loadReminderSchedule,
  loadReminderTankId,
  type ReminderMode,
  type ReminderSchedule,
} from '@/lib/reminders';
import { ANALYTE_LABELS } from '@/lib/water-status';
import { useTheme } from '@/theme';

type RangeInputState = Record<AnalyteKey, { low: string; high: string }>;
type SettingsSection =
  | 'home'
  | 'createNotification'
  | 'manageNotifications'
  | 'ranges'
  | 'backup'
  | 'about'
  | 'dataControls';

const HOUR_VALUES = Array.from({ length: 24 }, (_, index) => index + 1);
const DAY_VALUES = Array.from({ length: 60 }, (_, index) => index + 1);

function defaultRangeInputs(): RangeInputState {
  return Object.values(DEFAULT_ANALYTE_RANGES).reduce((result, range) => {
    result[range.analyte_key] = {
      low: range.low_value === null ? '' : String(range.low_value),
      high: range.high_value === null ? '' : String(range.high_value),
    };
    return result;
  }, {} as RangeInputState);
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatReminderInterval(reminder: NotificationReminder) {
  const unit =
    reminder.mode === 'hours'
      ? reminder.interval_value === 1
        ? 'hour'
        : 'hours'
      : reminder.interval_value === 1
        ? 'day'
        : 'days';
  return `Every ${reminder.interval_value} ${unit}`;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatNextReminder(schedule: ReminderSchedule) {
  const hours = schedule.mode === 'hours' ? schedule.interval : schedule.interval * 24;
  const nextReminder = new Date(Date.now() + hours * 60 * 60 * 1000);
  return nextReminder.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Button label="Back" variant="ghost" size="sm" leftIcon="arrow.left" onPress={onPress} haptic="none" />
  );
}

function ModeButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : pressed
              ? theme.colors.surfaceMuted
              : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
        },
      ]}>
      <Text
        style={[
          theme.typography.titleSm,
          { color: selected ? theme.colors.primaryContent : theme.colors.text },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function WheelSelector({
  values,
  selectedValue,
  onSelect,
}: {
  values: number[];
  selectedValue: number;
  onSelect: (value: number) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      style={[
        styles.wheel,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        },
      ]}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}>
      {values.map((value) => {
        const selected = value === selectedValue;
        return (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`${value}`}
            accessibilityState={{ selected }}
            style={[
              styles.wheelItem,
              {
                backgroundColor: selected ? theme.colors.surfaceAccent : 'transparent',
                borderBottomColor: theme.colors.border,
              },
            ]}
            onPress={() => onSelect(value)}>
            <Text
              style={[
                theme.typography.titleMd,
                { color: selected ? theme.colors.accent : theme.colors.text, fontVariant: ['tabular-nums'] },
              ]}>
              {value}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('home');
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [reminders, setReminders] = useState<NotificationReminder[]>([]);
  const [reminderTankId, setReminderTankId] = useState<number | null>(null);
  const [rangeTankId, setRangeTankId] = useState<number | null>(null);
  const [dataTankId, setDataTankId] = useState<number | null>(null);
  const [reminderSchedule, setReminderSchedule] =
    useState<ReminderSchedule>(DEFAULT_REMINDER_SCHEDULE);
  const [rangeInputs, setRangeInputs] = useState<RangeInputState>(defaultRangeInputs);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [isSavingRanges, setIsSavingRanges] = useState(false);
  const [isDeletingTankTests, setIsDeletingTankTests] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [rangeSaveMessage, setRangeSaveMessage] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const [savedTanks, defaultTankId, savedReminderTankId, savedSchedule, savedReminders] =
        await Promise.all([
          getTanks(),
          getDefaultTankId(),
          loadReminderTankId(),
          loadReminderSchedule(),
          getNotificationReminders(),
        ]);
      const fallbackTankId = savedReminderTankId ?? defaultTankId ?? savedTanks[0]?.id ?? null;

      setTanks(savedTanks);
      setReminders(savedReminders);
      setReminderTankId(fallbackTankId);
      setRangeTankId((current) =>
        savedTanks.some((tank) => tank.id === current) ? current : fallbackTankId,
      );
      setDataTankId((current) =>
        savedTanks.some((tank) => tank.id === current) ? current : fallbackTankId,
      );
      setReminderSchedule(
        savedSchedule.mode === 'none'
          ? { mode: 'days', interval: savedSchedule.interval || DEFAULT_REMINDER_SCHEDULE.interval }
          : savedSchedule,
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Settings failed', 'Could not load settings.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setActiveSection('home');
      loadSettings();
    }, [loadSettings]),
  );

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(''), 2500);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    async function loadRanges() {
      if (!rangeTankId) {
        setRangeInputs(defaultRangeInputs());
        setRangeSaveMessage('');
        return;
      }

      const ranges = await getAnalyteRanges(rangeTankId);

      setRangeInputs(
        ranges.reduce((result, range) => {
          result[range.analyte_key] = {
            low: range.low_value === null ? '' : String(range.low_value),
            high: range.high_value === null ? '' : String(range.high_value),
          };
          return result;
        }, {} as RangeInputState),
      );
      setRangeSaveMessage('');
    }

    loadRanges().catch((error) => {
      console.error(error);
      Alert.alert('Ranges failed', 'Could not load target ranges.');
    });
  }, [rangeTankId]);

  function updateRange(key: AnalyteKey, side: 'low' | 'high', value: string) {
    setRangeSaveMessage('');
    setRangeInputs((current) => ({
      ...current,
      [key]: { ...current[key], [side]: value },
    }));
  }

  function setReminderMode(mode: ReminderMode) {
    setReminderSchedule((current) => ({
      mode,
      interval: current.interval || 1,
    }));
  }

  function setReminderInterval(interval: number) {
    setReminderSchedule((current) => ({ ...current, interval }));
  }

  async function loadReminders() {
    setReminders(await getNotificationReminders());
  }

  async function saveReminder() {
    if (!reminderTankId) {
      Alert.alert('Choose a tank', 'Select which tank this reminder is for.');
      return;
    }
    const activeSchedule: { mode: 'hours' | 'days'; interval: number } =
      reminderSchedule.mode === 'none'
        ? { mode: 'days', interval: reminderSchedule.interval }
        : { mode: reminderSchedule.mode, interval: reminderSchedule.interval };

    try {
      setIsSavingReminder(true);
      const tank = reminderTankId ? await getTank(reminderTankId) : null;
      const result = tank
        ? await createReminderNotification(activeSchedule, tank)
        : { granted: false };

      if (!result.granted) {
        Alert.alert(
          'Notifications disabled',
          'Reminder permission was not granted. You can enable notifications in system settings.',
        );
        return;
      }

      await loadReminders();
      setToastMessage('Notification saved.');
      setActiveSection('manageNotifications');
    } catch (error) {
      console.error(error);
      Alert.alert('Reminder failed', 'Could not update the reminder.');
    } finally {
      setIsSavingReminder(false);
    }
  }

  function deleteReminder(reminder: NotificationReminder) {
    Alert.alert('Delete notification?', `Stop reminders for ${reminder.tank_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelReminderNotification(reminder);
            await loadReminders();
            setToastMessage('Notification deleted.');
          } catch (error) {
            console.error(error);
            Alert.alert('Delete failed', 'Could not delete this notification.');
          }
        },
      },
    ]);
  }

  async function saveRanges() {
    if (isSavingRanges) {
      return;
    }

    if (!rangeTankId) {
      Alert.alert('Choose a tank', 'Select which tank these ranges belong to.');
      return;
    }

    const parsedRanges = Object.entries(rangeInputs).map(([key, value]) => ({
      analyte_key: key as AnalyteKey,
      low_value: parseOptionalNumber(value.low),
      high_value: parseOptionalNumber(value.high),
    }));
    const invalidRange = parsedRanges.find(
      (range) => Number.isNaN(range.low_value) || Number.isNaN(range.high_value),
    );

    if (invalidRange) {
      Alert.alert(
        'Check target range',
        `${ANALYTE_LABELS[invalidRange.analyte_key]} values must be numbers.`,
      );
      return;
    }

    const reversedRange = parsedRanges.find(
      (range) =>
        range.low_value !== null &&
        range.high_value !== null &&
        range.low_value > range.high_value,
    );

    if (reversedRange) {
      Alert.alert(
        'Check target range',
        `${ANALYTE_LABELS[reversedRange.analyte_key]} low value must be less than the high value.`,
      );
      return;
    }

    try {
      setIsSavingRanges(true);
      await Promise.all(parsedRanges.map((range) => saveAnalyteRange(rangeTankId, range)));
      const tankName = tanks.find((tank) => tank.id === rangeTankId)?.name ?? 'this tank';
      const message = `Target ranges saved for ${tankName}.`;
      setRangeSaveMessage(message);
      setToastMessage(message);
    } catch (error) {
      console.error(error);
      Alert.alert('Ranges not saved', 'Could not save these target ranges.');
    } finally {
      setIsSavingRanges(false);
    }
  }

  function confirmDeleteTankTests() {
    if (!dataTankId) {
      Alert.alert('Choose a tank', 'Select which tank should have its tests deleted.');
      return;
    }

    const cleanupTankId = dataTankId;
    const tank = tanks.find((savedTank) => savedTank.id === dataTankId);

    Alert.alert(
      'Delete tank tests?',
      `Delete all saved tests for ${tank?.name ?? 'this tank'}? This keeps the tank, ranges, and notifications but removes its test history. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Tests',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingTankTests(true);
              await deleteWaterTestsForTank(cleanupTankId);
              setToastMessage('Tank tests deleted.');
            } catch (error) {
              console.error(error);
              Alert.alert('Delete failed', 'Could not delete this tank history.');
            } finally {
              setIsDeletingTankTests(false);
            }
          },
        },
      ],
    );
  }

  function confirmResetLocalData() {
    Alert.alert(
      'Reset all local data?',
      'This deletes all tanks, tests, target ranges, notifications, and settings on this device. A starter tank will be created so the app is ready to use again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset App',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResettingData(true);
              await cancelAllReminderNotifications();
              await resetLocalData();
              await loadSettings();
              setActiveSection('home');
              setToastMessage('Local data reset.');
            } catch (error) {
              console.error(error);
              Alert.alert('Reset failed', 'Could not reset local app data.');
            } finally {
              setIsResettingData(false);
            }
          },
        },
      ],
    );
  }

  async function exportAllTests() {
    try {
      setIsExportingBackup(true);
      const tests = await getAllWaterTests();
      await shareWaterTestsCsv(tests);
    } catch (error) {
      console.error(error);
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Could not export CSV.');
    } finally {
      setIsExportingBackup(false);
    }
  }

  function confirmImportCsv() {
    Alert.alert(
      'Import CSV backup?',
      'This adds tests from an Aquarium Water Log CSV. Existing matching rows are skipped, and missing tanks are created by name.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose CSV',
          onPress: async () => {
            try {
              setIsImportingBackup(true);
              const result = await pickAndImportWaterTestsCsv();
              if (!result) return;

              await loadSettings();
              setToastMessage(
                `Imported ${result.imported}; skipped ${result.skipped}; tanks created ${result.tanksCreated}.`,
              );
            } catch (error) {
              console.error(error);
              Alert.alert(
                'Import failed',
                error instanceof Error ? error.message : 'Could not import CSV.',
              );
            } finally {
              setIsImportingBackup(false);
            }
          },
        },
      ],
    );
  }

  function renderHome() {
    return (
      <>
        <Section title="Settings" />
        <View style={[styles.tileGrid, { gap: theme.spacing.md }]}>
          <TileButton
            title="Manage Notifications"
            description="Review and delete active reminders"
            icon="bell.fill"
            onPress={() => setActiveSection('manageNotifications')}
            style={styles.tileItem}
          />
          <TileButton
            title="Create Notification"
            description="Add a tank-specific testing reminder"
            icon="bell.badge.fill"
            onPress={() => setActiveSection('createNotification')}
            style={styles.tileItem}
          />
          <TileButton
            title="Target Ranges"
            description="Low and high values by tank"
            icon="target"
            onPress={() => setActiveSection('ranges')}
            style={styles.tileItem}
          />
          <TileButton
            title="Local Data"
            description="Delete tank tests or reset this device"
            icon="externaldrive.fill"
            onPress={() => setActiveSection('dataControls')}
            style={styles.tileItem}
          />
          <TileButton
            title="Backup & Import"
            description="Export or restore CSV water tests"
            icon="square.and.arrow.down.fill"
            onPress={() => setActiveSection('backup')}
            style={styles.tileItem}
          />
          <TileButton
            title="About & Help"
            description="Privacy, status labels, and target ranges"
            icon="info.circle.fill"
            onPress={() => setActiveSection('about')}
            style={styles.tileItem}
          />
        </View>
      </>
    );
  }

  function renderCreateNotification() {
    const values = reminderSchedule.mode === 'hours' ? HOUR_VALUES : DAY_VALUES;
    const unitLabel = reminderSchedule.mode === 'hours' ? 'hours' : 'days';

    return (
      <>
        <BackButton onPress={() => setActiveSection('home')} />
        <Section title="Create Notification" />
        <Card variant="standard" padding="md" elevation="sm">
          <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
            Choose a tank and set a flexible local reminder interval.
          </Text>
          <TankDropdown
            label="Reminder tank"
            tanks={tanks}
            selectedTankId={reminderTankId}
            onSelect={setReminderTankId}
            emptyLabel="Select reminder tank"
          />

          <View style={[styles.modeRow, { gap: theme.spacing.sm }]}>
            <ModeButton
              label="Hourly"
              selected={reminderSchedule.mode === 'hours'}
              onPress={() => setReminderMode('hours')}
            />
            <ModeButton
              label="Daily"
              selected={reminderSchedule.mode === 'days' || reminderSchedule.mode === 'none'}
              onPress={() => setReminderMode('days')}
            />
          </View>

          <Card variant="muted" padding="md" elevation="none">
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>Repeat every</Text>
            <View style={[styles.wheelRow, { gap: theme.spacing.sm }]}>
              <WheelSelector
                values={values}
                selectedValue={reminderSchedule.interval}
                onSelect={setReminderInterval}
              />
              <View
                style={[
                  styles.unitWheel,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.md,
                  },
                ]}>
                <Text style={[theme.typography.titleMd, { color: theme.colors.primary }]}>
                  {unitLabel}
                </Text>
              </View>
            </View>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              Next reminder: {formatNextReminder(reminderSchedule)}
            </Text>
          </Card>

          <Button
            label={isSavingReminder ? 'Saving...' : 'Create Notification'}
            onPress={saveReminder}
            loading={isSavingReminder}
            leftIcon="bell.badge.fill"
            fullWidth
          />
        </Card>
      </>
    );
  }

  function renderManageNotifications() {
    return (
      <>
        <BackButton onPress={() => setActiveSection('home')} />
        <Section title="Manage Notifications" />
        <Card variant="standard" padding="md" elevation="sm">
          <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
            One active notification is kept per tank. Creating a new one for the same tank replaces
            the previous schedule.
          </Text>

          {reminders.length === 0 ? (
            <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
              No notifications have been created yet.
            </Text>
          ) : null}

          {reminders.map((reminder) => (
            <Card key={reminder.id} variant="muted" padding="md" elevation="none">
              <View style={[styles.notificationRow, { gap: theme.spacing.md }]}>
                <View style={styles.notificationTextBlock}>
                  <Text style={[theme.typography.titleSm, { color: theme.colors.text }]}>
                    {reminder.tank_name}
                  </Text>
                  <Text style={[theme.typography.bodyMd, { color: theme.colors.primary }]}>
                    {formatReminderInterval(reminder)}
                  </Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                    Created {formatShortDate(reminder.created_at)}
                  </Text>
                </View>
                <Button
                  label="Delete"
                  size="sm"
                  variant="danger"
                  leftIcon="trash.fill"
                  onPress={() => deleteReminder(reminder)}
                  haptic="warning"
                  accessibilityLabel={`Delete reminder for ${reminder.tank_name}`}
                />
              </View>
            </Card>
          ))}

          <Button
            label="Create Notification"
            leftIcon="plus"
            variant="secondary"
            onPress={() => setActiveSection('createNotification')}
            fullWidth
          />
        </Card>
      </>
    );
  }

  function renderRanges() {
    return (
      <>
        <BackButton onPress={() => setActiveSection('home')} />
        <Section title="Target Ranges" />
        <Card variant="standard" padding="md" elevation="sm">
          <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
            Set low and high target values per tank. Empty values mean no target is set yet.
          </Text>
          <TankDropdown
            label="Range tank"
            tanks={tanks}
            selectedTankId={rangeTankId}
            onSelect={setRangeTankId}
            emptyLabel="Select range tank"
          />

          {Object.entries(rangeInputs).map(([key, value]) => {
            const analyteKey = key as AnalyteKey;
            return (
              <View key={key} style={[styles.rangeRow, { gap: theme.spacing.sm }]}>
                <Text style={[theme.typography.label, { color: theme.colors.text }]}>
                  {ANALYTE_LABELS[analyteKey]}
                </Text>
                <View style={[styles.rangeInputs, { gap: theme.spacing.sm }]}>
                  <TextField
                    value={value.low}
                    onChangeText={(text) => updateRange(analyteKey, 'low', text)}
                    placeholder="Low"
                    inputMode="decimal"
                    keyboardType="decimal-pad"
                    size="sm"
                    accessibilityLabel={`${ANALYTE_LABELS[analyteKey]} low target`}
                    containerStyle={styles.flex1}
                    inputStyle={{ fontVariant: ['tabular-nums'] }}
                  />
                  <TextField
                    value={value.high}
                    onChangeText={(text) => updateRange(analyteKey, 'high', text)}
                    placeholder="High"
                    inputMode="decimal"
                    keyboardType="decimal-pad"
                    size="sm"
                    accessibilityLabel={`${ANALYTE_LABELS[analyteKey]} high target`}
                    containerStyle={styles.flex1}
                    inputStyle={{ fontVariant: ['tabular-nums'] }}
                  />
                </View>
              </View>
            );
          })}

          <Button
            label={isSavingRanges ? 'Saving...' : 'Save Target Ranges'}
            onPress={saveRanges}
            loading={isSavingRanges}
            leftIcon="checkmark.circle.fill"
            fullWidth
          />
          {rangeSaveMessage ? (
            <Card variant="muted" padding="md" elevation="none">
              <Text style={[theme.typography.bodyMd, { color: theme.colors.success }]}>
                {rangeSaveMessage}
              </Text>
            </Card>
          ) : null}
        </Card>
      </>
    );
  }

  function renderDataControls() {
    return (
      <>
        <BackButton onPress={() => setActiveSection('home')} />
        <Section title="Local Data" />
        <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
          Manage records stored only on this device. These actions do not affect any external
          account because the app does not sync data to a server.
        </Text>

        <Card variant="warning" padding="md" elevation="sm">
          <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>
            Delete tests for one tank
          </Text>
          <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
            Removes saved test history for the selected tank while keeping the tank profile, target
            ranges, and notifications.
          </Text>
          <TankDropdown
            label="Cleanup tank"
            tanks={tanks}
            selectedTankId={dataTankId}
            onSelect={setDataTankId}
            emptyLabel="Select cleanup tank"
          />
          <Button
            label={isDeletingTankTests ? 'Deleting...' : 'Delete Tests For Tank'}
            variant="danger"
            leftIcon="trash.fill"
            onPress={confirmDeleteTankTests}
            loading={isDeletingTankTests}
            haptic="warning"
            fullWidth
          />
        </Card>

        <Card variant="warning" padding="md" elevation="sm">
          <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>Reset app data</Text>
          <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
            Deletes all tanks, tests, target ranges, local notification records, and app settings.
            Scheduled reminders are canceled.
          </Text>
          <Button
            label={isResettingData ? 'Resetting...' : 'Reset All Local Data'}
            variant="danger"
            leftIcon="arrow.clockwise"
            onPress={confirmResetLocalData}
            loading={isResettingData}
            haptic="warning"
            fullWidth
          />
        </Card>
      </>
    );
  }

  function renderBackup() {
    return (
      <>
        <BackButton onPress={() => setActiveSection('home')} />
        <Section title="Backup & Import" />
        <Card variant="standard" padding="md" elevation="sm">
          <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
            Export creates a CSV you can save to cloud storage, email to yourself, or move to
            another device. Import merges rows from an Aquarium Water Log CSV.
          </Text>

          <Card variant="muted" padding="md" elevation="none">
            <Text style={[theme.typography.titleSm, { color: theme.colors.text }]}>
              What import does
            </Text>
            <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
              Creates missing tanks by name.
            </Text>
            <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
              Adds new water tests.
            </Text>
            <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
              Skips rows that already match existing readings.
            </Text>
          </Card>

          <Button
            label={isExportingBackup ? 'Exporting...' : 'Export All Tests CSV'}
            leftIcon="square.and.arrow.up.fill"
            onPress={exportAllTests}
            loading={isExportingBackup}
            fullWidth
          />
          <Button
            label={isImportingBackup ? 'Importing...' : 'Import Tests From CSV'}
            variant="secondary"
            leftIcon="square.and.arrow.down.fill"
            onPress={confirmImportCsv}
            loading={isImportingBackup}
            fullWidth
          />
        </Card>
      </>
    );
  }

  function renderAbout() {
    return (
      <>
        <BackButton onPress={() => setActiveSection('home')} />
        <Section title="About & Help" />
        <Card variant="standard" padding="md" elevation="sm">
          <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>
            Aquarium Water Log
          </Text>
          <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
            This app is local-first. Tanks, readings, target ranges, reminders, and settings are
            stored on this device. There is no account, backend, cloud sync, ads, or subscription.
          </Text>

          <Card variant="muted" padding="md" elevation="none">
            <Text style={[theme.typography.titleSm, { color: theme.colors.text }]}>Status Labels</Text>
            <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
              Good: measured values are within target.
            </Text>
            <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
              Caution: one or more values are outside target.
            </Text>
            <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
              Danger: a value needs immediate attention, such as NO2 above zero.
            </Text>
          </Card>

          <Card variant="muted" padding="md" elevation="none">
            <Text style={[theme.typography.titleSm, { color: theme.colors.text }]}>Target Ranges</Text>
            <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
              Target ranges let each tank have its own low and high values for NO3, NO2, pH, KH, and
              GH. Empty low or high values mean that side of the target is not checked.
            </Text>
          </Card>

          <Card variant="muted" padding="md" elevation="none">
            <Text style={[theme.typography.titleSm, { color: theme.colors.text }]}>Backups</Text>
            <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
              CSV export is the portable backup format. Keep a copy outside the app before
              uninstalling, changing phones, or resetting local data.
            </Text>
          </Card>
        </Card>
      </>
    );
  }

  return (
    <Screen>
      {activeSection === 'home' ? renderHome() : null}
      {activeSection === 'manageNotifications' ? renderManageNotifications() : null}
      {activeSection === 'createNotification' ? renderCreateNotification() : null}
      {activeSection === 'ranges' ? renderRanges() : null}
      {activeSection === 'backup' ? renderBackup() : null}
      {activeSection === 'about' ? renderAbout() : null}
      {activeSection === 'dataControls' ? renderDataControls() : null}

      {toastMessage ? (
        <View
          style={[
            styles.toast,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
            },
          ]}
          accessibilityLiveRegion="polite">
          <Text style={[theme.typography.titleSm, { color: theme.colors.primaryContent }]}>
            {toastMessage}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tileItem: {
    // Two-column grid; `gap` on the parent handles the inter-tile spacing.
    flex: 0,
    flexBasis: '48%',
  },
  modeRow: { flexDirection: 'row' },
  modeButton: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
  },
  wheelRow: { flexDirection: 'row' },
  wheel: {
    borderWidth: 1,
    flex: 1,
    height: 150,
  },
  wheelItem: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  unitWheel: {
    alignItems: 'center',
    borderWidth: 1,
    height: 150,
    justifyContent: 'center',
    width: 110,
  },
  rangeRow: {},
  rangeInputs: { flexDirection: 'row' },
  flex1: { flex: 1 },
  notificationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationTextBlock: { flex: 1, gap: 2 },
  toast: {
    alignSelf: 'center',
    marginTop: 4,
  },
});
