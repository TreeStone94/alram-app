import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/lib/storage';

const MAX_ERROR_LOGS = 50;

export interface ErrorLog {
  timestamp: string;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export async function appendErrorLog(entry: Omit<ErrorLog, 'timestamp'>): Promise<void> {
  const logs = await getErrorLogs();
  const nextLogs = [
    ...logs,
    {
      ...entry,
      timestamp: new Date().toISOString(),
    },
  ].slice(-MAX_ERROR_LOGS);

  await AsyncStorage.setItem(STORAGE_KEYS.ERROR_LOGS, JSON.stringify(nextLogs));
}

export async function getErrorLogs(): Promise<ErrorLog[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.ERROR_LOGS);
  if (raw === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ErrorLog[]) : [];
  } catch {
    return [];
  }
}

export async function clearErrorLogs(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.ERROR_LOGS);
}
