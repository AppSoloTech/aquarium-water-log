import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { TankDropdown } from '@/components/tank-dropdown';
import { AquariumTheme } from '@/constants/aquarium-theme';
import {
  DEFAULT_ANALYTE_RANGES,
  deleteWaterTestsForTank,
  getAnalyteRanges,
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

const ANALYTE_LABELS: Record<AnalyteKey, string> = {
  nitrate_no3: 'NO3 nitrate',
  nitrite_no2: 'NO2 nitrite',
  ph: 'pH',
  kh: 'KH',
  gh: 'GH',
};

type RangeInputState = Record<AnalyteKey, { low: string; high: string }>;
type SettingsSection = 'home' | 'createNotification' | 'manageNotifications' | 'ranges' | 'dataControls';

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

  if (!trimmed) {
    return null;
  }

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

function HeaderBack({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.detailHeader}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
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
  return (
    <Pressable style={[styles.modeButton, selected ? styles.selectedModeButton : null]} onPress={onPress}>
      <Text style={[styles.modeButtonText, selected ? styles.selectedModeButtonText : null]}>
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
  return (
    <ScrollView style={styles.wheel} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      {values.map((value) => {
        const selected = value === selectedValue;

        return (
          <Pressable
            key={value}
            style={[styles.wheelItem, selected ? styles.selectedWheelItem : null]}
            onPress={() => onSelect(value)}>
            <Text style={[styles.wheelText, selected ? styles.selectedWheelText : null]}>{value}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function SettingsScreen() {
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
  const [toastMessage, setToastMessage] = useState('');

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
    if (!toastMessage) {
      return;
    }

    const timeout = setTimeout(() => setToastMessage(''), 2500);

    return () => clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    async function loadRanges() {
      if (!rangeTankId) {
        setRangeInputs(defaultRangeInputs());
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
    }

    loadRanges().catch((error) => {
      console.error(error);
      Alert.alert('Ranges failed', 'Could not load target ranges.');
    });
  }, [rangeTankId]);

  function updateRange(key: AnalyteKey, side: 'low' | 'high', value: string) {
    setRangeInputs((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [side]: value,
      },
    }));
  }

  function setReminderMode(mode: ReminderMode) {
    setReminderSchedule((current) => ({
      mode,
      interval: current.interval || 1,
    }));
  }

  function setReminderInterval(interval: number) {
    setReminderSchedule((current) => ({
      ...current,
      interval,
    }));
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
      const result =
        tank
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

    try {
      setIsSavingRanges(true);
      await Promise.all(parsedRanges.map((range) => saveAnalyteRange(rangeTankId, range)));
      setToastMessage('Target ranges saved.');
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
      'This deletes all tanks, tests, target ranges, notifications, and settings on this device. A new default tank will be created so the app is ready to use again.',
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

  function renderSettingsHome() {
    return (
      <>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.tileGrid}>
          <Pressable style={styles.tile} onPress={() => setActiveSection('manageNotifications')}>
            <Text style={styles.tileIcon}>N</Text>
            <Text style={styles.tileTitle}>Manage Notifications</Text>
            <Text style={styles.tileText}>Review and delete active reminders</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => setActiveSection('createNotification')}>
            <Text style={styles.tileIcon}>+</Text>
            <Text style={styles.tileTitle}>Create Notification</Text>
            <Text style={styles.tileText}>Add a tank-specific testing reminder</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => setActiveSection('ranges')}>
            <Text style={styles.tileIcon}>pH</Text>
            <Text style={styles.tileTitle}>Target Ranges</Text>
            <Text style={styles.tileText}>Low and high values by tank</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => setActiveSection('dataControls')}>
            <Text style={styles.tileIcon}>DB</Text>
            <Text style={styles.tileTitle}>Local Data</Text>
            <Text style={styles.tileText}>Delete tank tests or reset this device</Text>
          </Pressable>
        </View>
      </>
    );
  }

  function renderCreateNotification() {
    const values = reminderSchedule.mode === 'hours' ? HOUR_VALUES : DAY_VALUES;
    const unitLabel = reminderSchedule.mode === 'hours' ? 'hours' : 'days';

    return (
      <>
        <HeaderBack title="Create Notification" onBack={() => setActiveSection('home')} />
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>New Test Reminder</Text>
          <Text style={styles.helpText}>Choose a tank and set a flexible local reminder interval.</Text>
          <TankDropdown
            label="Reminder tank"
            tanks={tanks}
            selectedTankId={reminderTankId}
            onSelect={setReminderTankId}
            emptyLabel="Select reminder tank"
          />

          <View style={styles.modeRow}>
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

          <View style={styles.wheelPanel}>
            <Text style={styles.rangeLabel}>Repeat every</Text>
            <View style={styles.wheelRow}>
              <WheelSelector
                values={values}
                selectedValue={reminderSchedule.interval}
                onSelect={setReminderInterval}
              />
              <View style={styles.unitWheel}>
                <Text style={styles.unitWheelText}>{unitLabel}</Text>
              </View>
            </View>
          </View>

          <Pressable style={styles.primaryButton} onPress={saveReminder} disabled={isSavingReminder}>
            <Text style={styles.primaryButtonText}>
              {isSavingReminder ? 'Saving...' : 'Create Notification'}
            </Text>
          </Pressable>
        </View>
      </>
    );
  }

  function renderManageNotifications() {
    return (
      <>
        <HeaderBack title="Manage Notifications" onBack={() => setActiveSection('home')} />
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Active Notifications</Text>
          <Text style={styles.helpText}>
            One active notification is kept per tank. Creating a new one for the same tank replaces
            the previous schedule.
          </Text>

          {reminders.length === 0 ? (
            <Text style={styles.emptyText}>No notifications have been created yet.</Text>
          ) : null}

          {reminders.map((reminder) => (
            <View key={reminder.id} style={styles.notificationRow}>
              <View style={styles.notificationTextBlock}>
                <Text style={styles.notificationTitle}>{reminder.tank_name}</Text>
                <Text style={styles.notificationInterval}>{formatReminderInterval(reminder)}</Text>
                <Text style={styles.helpText}>Created {formatShortDate(reminder.created_at)}</Text>
              </View>
              <Pressable style={styles.deleteButton} onPress={() => deleteReminder(reminder)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            style={styles.primaryButton}
            onPress={() => setActiveSection('createNotification')}>
            <Text style={styles.primaryButtonText}>Create Notification</Text>
          </Pressable>
        </View>
      </>
    );
  }

  function renderRangeSettings() {
    return (
      <>
        <HeaderBack title="Target Ranges" onBack={() => setActiveSection('home')} />
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Target Ranges</Text>
          <Text style={styles.helpText}>
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
              <View key={key} style={styles.rangeRow}>
                <Text style={styles.rangeLabel}>{ANALYTE_LABELS[analyteKey]}</Text>
                <View style={styles.rangeInputs}>
                  <TextInput
                    inputMode="decimal"
                    keyboardType="decimal-pad"
                    style={styles.rangeInput}
                    value={value.low}
                    onChangeText={(text) => updateRange(analyteKey, 'low', text)}
                    placeholder="Low"
                  />
                  <TextInput
                    inputMode="decimal"
                    keyboardType="decimal-pad"
                    style={styles.rangeInput}
                    value={value.high}
                    onChangeText={(text) => updateRange(analyteKey, 'high', text)}
                    placeholder="High"
                  />
                </View>
              </View>
            );
          })}

          <Pressable style={styles.primaryButton} onPress={saveRanges} disabled={isSavingRanges}>
            <Text style={styles.primaryButtonText}>
              {isSavingRanges ? 'Saving...' : 'Save Target Ranges'}
            </Text>
          </Pressable>
        </View>
      </>
    );
  }

  function renderDataControls() {
    return (
      <>
        <HeaderBack title="Local Data" onBack={() => setActiveSection('home')} />
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Data Controls</Text>
          <Text style={styles.helpText}>
            Manage records stored only on this device. These actions do not affect any external
            account because the app does not sync data to a server.
          </Text>

          <View style={styles.warningPanel}>
            <Text style={styles.warningTitle}>Delete tests for one tank</Text>
            <Text style={styles.helpText}>
              Removes saved test history for the selected tank while keeping the tank profile,
              target ranges, and notifications.
            </Text>
            <TankDropdown
              label="Cleanup tank"
              tanks={tanks}
              selectedTankId={dataTankId}
              onSelect={setDataTankId}
              emptyLabel="Select cleanup tank"
            />
            <Pressable
              style={[styles.dangerButton, isDeletingTankTests ? styles.disabledButton : null]}
              onPress={confirmDeleteTankTests}
              disabled={isDeletingTankTests}>
              <Text style={styles.dangerButtonText}>
                {isDeletingTankTests ? 'Deleting...' : 'Delete Tests For Tank'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.warningPanel}>
            <Text style={styles.warningTitle}>Reset app data</Text>
            <Text style={styles.helpText}>
              Deletes all tanks, tests, target ranges, local notification records, and app
              settings. Scheduled reminders are canceled.
            </Text>
            <Pressable
              style={[styles.dangerButton, isResettingData ? styles.disabledButton : null]}
              onPress={confirmResetLocalData}
              disabled={isResettingData}>
              <Text style={styles.dangerButtonText}>
                {isResettingData ? 'Resetting...' : 'Reset All Local Data'}
              </Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {activeSection === 'home' ? renderSettingsHome() : null}
      {activeSection === 'manageNotifications' ? renderManageNotifications() : null}
      {activeSection === 'createNotification' ? renderCreateNotification() : null}
      {activeSection === 'ranges' ? renderRangeSettings() : null}
      {activeSection === 'dataControls' ? renderDataControls() : null}

      {toastMessage ? <Text style={styles.toast}>{toastMessage}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AquariumTheme.screen,
    flexGrow: 1,
    gap: 16,
    padding: 20,
    paddingTop: 64,
  },
  title: {
    color: AquariumTheme.primaryDark,
    fontSize: 28,
    fontWeight: '800',
  },
  detailHeader: {
    gap: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: AquariumTheme.primary,
    fontWeight: '800',
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '47%',
    gap: 8,
    elevation: 2,
    minHeight: 142,
    padding: 16,
    shadowColor: AquariumTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tileIcon: {
    alignSelf: 'flex-start',
    backgroundColor: AquariumTheme.surfaceMint,
    borderRadius: 8,
    color: AquariumTheme.primary,
    fontSize: 18,
    fontWeight: '900',
    minWidth: 38,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
  },
  tileTitle: {
    color: AquariumTheme.text,
    fontSize: 18,
    fontWeight: '800',
  },
  tileText: {
    color: AquariumTheme.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  panel: {
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    gap: 12,
    padding: 16,
    shadowColor: AquariumTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  panelTitle: {
    color: AquariumTheme.primaryDark,
    fontSize: 20,
    fontWeight: '700',
  },
  helpText: {
    color: AquariumTheme.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.primary,
    borderRadius: 8,
    padding: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  selectedModeButton: {
    backgroundColor: AquariumTheme.surfaceMint,
    borderColor: AquariumTheme.teal,
  },
  modeButtonText: {
    color: AquariumTheme.text,
    fontSize: 15,
    fontWeight: '800',
  },
  selectedModeButtonText: {
    color: AquariumTheme.teal,
  },
  wheelPanel: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  wheelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  wheel: {
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    height: 150,
  },
  wheelItem: {
    alignItems: 'center',
    borderBottomColor: AquariumTheme.borderSoft,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  selectedWheelItem: {
    backgroundColor: AquariumTheme.surfaceMint,
  },
  wheelText: {
    color: AquariumTheme.text,
    fontSize: 20,
    fontWeight: '700',
  },
  selectedWheelText: {
    color: AquariumTheme.teal,
  },
  unitWheel: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 150,
    justifyContent: 'center',
    width: 110,
  },
  unitWheelText: {
    color: AquariumTheme.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  optionGroup: {
    gap: 10,
  },
  optionButton: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  selectedOption: {
    backgroundColor: AquariumTheme.surfaceMint,
    borderColor: AquariumTheme.teal,
  },
  optionText: {
    color: AquariumTheme.text,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedOptionText: {
    color: AquariumTheme.teal,
  },
  rangeRow: {
    gap: 8,
  },
  rangeLabel: {
    color: AquariumTheme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  rangeInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  rangeInput: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    color: AquariumTheme.text,
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyText: {
    color: AquariumTheme.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  notificationRow: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  notificationTextBlock: {
    flex: 1,
    gap: 2,
  },
  notificationTitle: {
    color: AquariumTheme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  notificationInterval: {
    color: AquariumTheme.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  deleteButton: {
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#b42318',
    fontWeight: '800',
  },
  warningPanel: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  warningTitle: {
    color: '#9a3412',
    fontSize: 17,
    fontWeight: '800',
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#b42318',
    borderRadius: 8,
    padding: 14,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.65,
  },
  toast: {
    alignSelf: 'center',
    backgroundColor: AquariumTheme.primary,
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
