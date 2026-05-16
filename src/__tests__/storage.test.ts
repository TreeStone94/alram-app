import AsyncStorage from '@react-native-async-storage/async-storage';

import { CURRENT_SCHEMA_VERSION } from '@/constants/config';
import { STORAGE_KEYS, migrateScheduledAlarm, storage } from '@/lib/storage';
import type { ScheduledAlarm } from '@/types/alarm';

const scheduledAlarm: ScheduledAlarm = {
  config: {
    id: 'alarm-1',
    baseTime: '06:40',
    earlyMinutes: 20,
    daysOfWeek: ['MON', 'TUE'],
    enabled: true,
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z',
  },
  scheduledTime: '06:20',
  scheduledAt: '2026-05-15T21:20:00.000Z',
  weatherAdjusted: true,
  precipType: 1,
  notificationId: 'notification-1',
  schemaVersion: 0,
  forecastSnapshot: null,
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('returns null when stored JSON is invalid', async () => {
  await AsyncStorage.setItem(STORAGE_KEYS.ALARM_CONFIG, '{bad json');

  await expect(storage.alarmConfig.get()).resolves.toBeNull();
});

it('migrates scheduled alarms to the current schema version and persists them', async () => {
  const migrated = await migrateScheduledAlarm(scheduledAlarm);
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULED_ALARM);

  expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  expect(JSON.parse(stored ?? '{}')).toMatchObject({
    notificationId: 'notification-1',
    schemaVersion: CURRENT_SCHEMA_VERSION,
  });
});
