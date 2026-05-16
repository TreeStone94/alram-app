import AsyncStorage from '@react-native-async-storage/async-storage';

import { appendErrorLog, clearErrorLogs, getErrorLogs } from '@/lib/error-log';
import { STORAGE_KEYS } from '@/lib/storage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('keeps only the latest 50 error logs', async () => {
  for (let index = 0; index < 55; index += 1) {
    await appendErrorLog({ code: `E_${index}`, message: `error ${index}` });
  }

  const logs = await getErrorLogs();

  expect(logs).toHaveLength(50);
  expect(logs[0].code).toBe('E_5');
  expect(logs[49].code).toBe('E_54');
});

it('returns an empty array for invalid stored logs and can clear logs', async () => {
  await AsyncStorage.setItem(STORAGE_KEYS.ERROR_LOGS, '{bad json');

  await expect(getErrorLogs()).resolves.toEqual([]);

  await appendErrorLog({ code: 'E_VALID', message: 'valid' });
  await clearErrorLogs();

  await expect(getErrorLogs()).resolves.toEqual([]);
});
