const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function isAlarmTimeTtlValid(fetchedAt: Date, nextAlarmTime: Date): boolean {
  const fetchedAtMs = fetchedAt.getTime();
  const nextAlarmTimeMs = nextAlarmTime.getTime();

  if (!Number.isFinite(fetchedAtMs) || !Number.isFinite(nextAlarmTimeMs)) {
    return false;
  }

  const alarmTtlBoundaryMs = nextAlarmTimeMs + TWO_HOURS_MS;

  return fetchedAtMs < nextAlarmTimeMs && fetchedAtMs < alarmTtlBoundaryMs;
}

export function makeCacheKey(nx: number, ny: number, date: string): string {
  return `weather_cache_${nx}_${ny}_${date}`;
}
