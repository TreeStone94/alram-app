export const CURRENT_SCHEMA_VERSION = 1;

export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  timeoutMs: 8000,
} as const;

export const CACHE_CONFIG = {
  fallbackTtlMs: 4 * 60 * 60 * 1000,
  cleanupThresholdDays: 7,
} as const;

export const ALARM_CONFIG = {
  defaultEarlyMinutes: 20,
  defaultDaysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const,
  debounceMs: 1500,
  locationTimeoutMs: 10000,
} as const;

export const TTS_CONFIG = {
  startDelayMs: 500,
  timeoutMs: 60000,
} as const;

export const KMA_MAINTENANCE = {
  startHour: 4,
  startMinute: 0,
  endHour: 4,
  endMinute: 10,
} as const;
