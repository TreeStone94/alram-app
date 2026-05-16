import { isAlarmTimeTtlValid, makeCacheKey } from '@/lib/cache';

describe('isAlarmTimeTtlValid', () => {
  it('keeps a midnight fetch valid for a 06:20 alarm', () => {
    const alarm = new Date('2026-04-19T06:20:00+09:00');
    const fetched = new Date('2026-04-19T00:30:00+09:00');

    expect(isAlarmTimeTtlValid(fetched, alarm)).toBe(true);
  });

  it('keeps a pre-alarm fetch valid when it is before the alarm plus two hours', () => {
    const alarm = new Date('2026-04-19T06:20:00+09:00');
    const fetched = new Date('2026-04-19T05:00:00+09:00');

    expect(isAlarmTimeTtlValid(fetched, alarm)).toBe(true);
  });

  it('expires a fetch made after the alarm time', () => {
    const alarm = new Date('2026-04-19T06:20:00+09:00');
    const fetchedAfter = new Date('2026-04-19T07:00:00+09:00');

    expect(isAlarmTimeTtlValid(fetchedAfter, alarm)).toBe(false);
  });

  it('expires a fetch exactly at nextAlarmTime plus two hours', () => {
    const alarm = new Date('2026-04-19T06:20:00+09:00');
    const fetchedAtBoundary = new Date('2026-04-19T08:20:00+09:00');

    expect(isAlarmTimeTtlValid(fetchedAtBoundary, alarm)).toBe(false);
  });
});

describe('makeCacheKey', () => {
  it('builds a location and date scoped weather cache key', () => {
    expect(makeCacheKey(60, 127, '20260419')).toBe('weather_cache_60_127_20260419');
  });
});
