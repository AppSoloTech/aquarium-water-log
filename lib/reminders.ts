import { Platform } from 'react-native';

import {
  createNotificationReminder,
  deleteNotificationReminder,
  getNotificationRemindersForTank,
  loadSetting,
  REMINDER_FREQUENCY_KEY,
  REMINDER_INTERVAL_KEY,
  REMINDER_MODE_KEY,
  REMINDER_TANK_ID_KEY,
  saveSetting,
  type NotificationReminder,
  type Tank,
} from './database';

export type ReminderMode = 'none' | 'hours' | 'days';
export type ActiveReminderMode = 'hours' | 'days';
export type ReminderSchedule = {
  mode: ReminderMode;
  interval: number;
};

const REMINDER_CHANNEL_ID = 'water-test-reminders';
type NotificationsModule = typeof import('expo-notifications');

let notificationsPromise: Promise<NotificationsModule> | null = null;
let notificationHandlerConfigured = false;

export const DEFAULT_REMINDER_SCHEDULE: ReminderSchedule = {
  mode: 'none',
  interval: 7,
};

async function getNotifications() {
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications');
  }

  return notificationsPromise;
}

export async function configureNotificationHandler() {
  if (notificationHandlerConfigured) {
    return;
  }

  const Notifications = await getNotifications();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  notificationHandlerConfigured = true;
}

async function prepareAndroidChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  const Notifications = await getNotifications();

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Water test reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function loadReminderSchedule(): Promise<ReminderSchedule> {
  const [modeValue, intervalValue, oldFrequencyValue] = await Promise.all([
    loadSetting(REMINDER_MODE_KEY),
    loadSetting(REMINDER_INTERVAL_KEY),
    loadSetting(REMINDER_FREQUENCY_KEY),
  ]);
  const parsedInterval = Number(intervalValue);

  if (modeValue === 'hours' || modeValue === 'days') {
    return {
      mode: modeValue,
      interval: Number.isFinite(parsedInterval) && parsedInterval > 0 ? parsedInterval : 1,
    };
  }

  if (oldFrequencyValue === '3' || oldFrequencyValue === '7' || oldFrequencyValue === '14') {
    return {
      mode: 'days',
      interval: Number(oldFrequencyValue),
    };
  }

  return DEFAULT_REMINDER_SCHEDULE;
}

export async function saveReminderSchedule(schedule: ReminderSchedule) {
  await Promise.all([
    saveSetting(REMINDER_MODE_KEY, schedule.mode),
    saveSetting(REMINDER_INTERVAL_KEY, String(schedule.interval)),
    saveSetting(REMINDER_FREQUENCY_KEY, schedule.mode === 'days' ? String(schedule.interval) : 'none'),
  ]);
}

export async function loadReminderTankId() {
  const value = await loadSetting(REMINDER_TANK_ID_KEY);
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function saveReminderTankId(tankId: number | null) {
  await saveSetting(REMINDER_TANK_ID_KEY, tankId ? String(tankId) : '');
}

export async function scheduleReminder(schedule: ReminderSchedule, tank: Tank | null) {
  await saveReminderSchedule(schedule);
  await saveReminderTankId(tank?.id ?? null);

  if (schedule.mode === 'none') {
    return { granted: true };
  }

  await prepareAndroidChannel();

  const Notifications = await getNotifications();
  const permission = await Notifications.requestPermissionsAsync();

  if (!permission.granted) {
    return { granted: false };
  }

  await configureNotificationHandler();

  const seconds =
    schedule.mode === 'hours' ? schedule.interval * 60 * 60 : schedule.interval * 24 * 60 * 60;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: tank ? `Time to test ${tank.name}` : 'Time to test your aquarium water',
      body: tank
        ? `Log a quick water test for ${tank.name}.`
        : 'Log a quick water test to keep your tank history current.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: true,
      channelId: REMINDER_CHANNEL_ID,
    },
  });

  return { granted: true };
}

export async function createReminderNotification(
  schedule: { mode: ActiveReminderMode; interval: number },
  tank: Tank,
) {
  await saveReminderSchedule(schedule);
  await saveReminderTankId(tank.id);
  await prepareAndroidChannel();

  const Notifications = await getNotifications();
  const permission = await Notifications.requestPermissionsAsync();

  if (!permission.granted) {
    return { granted: false };
  }

  await configureNotificationHandler();

  const existingReminders = await getNotificationRemindersForTank(tank.id);

  await Promise.all(existingReminders.map((reminder) => cancelReminderNotification(reminder)));

  const seconds =
    schedule.mode === 'hours' ? schedule.interval * 60 * 60 : schedule.interval * 24 * 60 * 60;
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time to test ${tank.name}`,
      body: `Log a quick water test for ${tank.name}.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: true,
      channelId: REMINDER_CHANNEL_ID,
    },
  });

  await createNotificationReminder({
    tankId: tank.id,
    tankName: tank.name,
    mode: schedule.mode,
    intervalValue: schedule.interval,
    notificationId,
  });

  return { granted: true };
}

export async function cancelReminderNotification(reminder: NotificationReminder) {
  const Notifications = await getNotifications();

  await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
  await deleteNotificationReminder(reminder.id);
}

export async function cancelAllReminderNotifications() {
  const Notifications = await getNotifications();

  await Notifications.cancelAllScheduledNotificationsAsync();
}
