import AsyncStorage from '@react-native-async-storage/async-storage';

import { CURRENT_SCHEMA_VERSION } from '@/constants/config';
import type { AlarmConfig, ScheduledAlarm } from '@/types/alarm';

export const STORAGE_KEYS = {
  ALARM_CONFIG: 'alarm_config',
  SCHEDULED_ALARM: 'scheduled_alarm',
  LAST_LOCATION: 'last_location',
  MANUAL_ADDRESS: 'manual_address',
  ERROR_LOGS: 'error_logs',
} as const;

export type LastLocation = { lat: number; lon: number; nx: number; ny: number };
export type ManualAddress = { sido: string; sigungu: string; nx: number; ny: number };

async function getItem<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function migrateScheduledAlarm(alarm: ScheduledAlarm): Promise<ScheduledAlarm> {
  if (alarm.schemaVersion >= CURRENT_SCHEMA_VERSION) {
    return alarm;
  }

  const migrated: ScheduledAlarm = {
    ...alarm,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  await storage.scheduledAlarm.set(migrated);
  return migrated;
}

export const storage = {
  alarmConfig: {
    get(): Promise<AlarmConfig | null> {
      return getItem<AlarmConfig>(STORAGE_KEYS.ALARM_CONFIG);
    },
    set(config: AlarmConfig): Promise<void> {
      return setItem(STORAGE_KEYS.ALARM_CONFIG, config);
    },
    remove(): Promise<void> {
      return removeItem(STORAGE_KEYS.ALARM_CONFIG);
    },
  },
  scheduledAlarm: {
    async get(): Promise<ScheduledAlarm | null> {
      const alarm = await getItem<ScheduledAlarm>(STORAGE_KEYS.SCHEDULED_ALARM);
      return alarm ? migrateScheduledAlarm(alarm) : null;
    },
    set(alarm: ScheduledAlarm): Promise<void> {
      return setItem(STORAGE_KEYS.SCHEDULED_ALARM, alarm);
    },
    remove(): Promise<void> {
      return removeItem(STORAGE_KEYS.SCHEDULED_ALARM);
    },
  },
  lastLocation: {
    get(): Promise<LastLocation | null> {
      return getItem<LastLocation>(STORAGE_KEYS.LAST_LOCATION);
    },
    set(loc: LastLocation): Promise<void> {
      return setItem(STORAGE_KEYS.LAST_LOCATION, loc);
    },
  },
  manualAddress: {
    get(): Promise<ManualAddress | null> {
      return getItem<ManualAddress>(STORAGE_KEYS.MANUAL_ADDRESS);
    },
    set(addr: ManualAddress): Promise<void> {
      return setItem(STORAGE_KEYS.MANUAL_ADDRESS, addr);
    },
  },
};
