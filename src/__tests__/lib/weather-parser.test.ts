import {
  ParseError,
  nearestSlot,
  parseKmaResponse,
  precipWindow,
  type KmaItem,
} from '@/lib/weather-parser';

const buildItems = (overrides: Partial<KmaItem>[] = []): KmaItem[] => {
  const defaults: KmaItem[] = [
    { category: 'PTY', fcstDate: '20260517', fcstTime: '0500', fcstValue: '0' },
    { category: 'PTY', fcstDate: '20260517', fcstTime: '0600', fcstValue: '0' },
    { category: 'PTY', fcstDate: '20260517', fcstTime: '0700', fcstValue: '3' },
    { category: 'PTY', fcstDate: '20260517', fcstTime: '0900', fcstValue: '0' },
    { category: 'SKY', fcstDate: '20260517', fcstTime: '0600', fcstValue: '4' },
    { category: 'TMP', fcstDate: '20260517', fcstTime: '0600', fcstValue: '-2' },
    { category: 'TMX', fcstDate: '20260517', fcstTime: '1500', fcstValue: '4' },
    { category: 'TMN', fcstDate: '20260517', fcstTime: '0600', fcstValue: '-6' },
    { category: 'REH', fcstDate: '20260517', fcstTime: '0600', fcstValue: '75' },
    { category: 'WSD', fcstDate: '20260517', fcstTime: '0600', fcstValue: '3.2' },
  ];

  return [...defaults, ...overrides.map((item) => ({ ...defaults[0], ...item }))];
};

describe('nearestSlot', () => {
  it('returns the closest previous slot when it is nearer', () => {
    expect(nearestSlot('06:35', ['0500', '0600', '0700'])).toBe('0600');
  });

  it('returns the closest next slot when it is nearer', () => {
    expect(nearestSlot('06:50', ['0600', '0700'])).toBe('0700');
  });

  it('handles the midnight boundary', () => {
    expect(nearestSlot('00:05', ['0000', '0100'])).toBe('0000');
  });

  it('does not prefer 2400 over the same-day 2300 slot near midnight', () => {
    expect(nearestSlot('23:55', ['2300', '2400'])).toBe('2300');
  });
});

describe('precipWindow', () => {
  it('returns slots from one hour before through two hours after the alarm time', () => {
    const window = precipWindow('06:20', ['0400', '0500', '0600', '0700', '0800', '0900']);

    expect(window).toContain('0500');
    expect(window).toContain('0600');
    expect(window).toContain('0700');
    expect(window).toContain('0800');
    expect(window).not.toContain('0400');
    expect(window).not.toContain('0900');
  });
});

describe('parseKmaResponse', () => {
  it('parses a valid KMA forecast response', () => {
    const forecast = parseKmaResponse(buildItems(), 60, 127, '06:20');

    expect(forecast).toEqual({
      nx: 60,
      ny: 127,
      baseDate: '20260517',
      baseTime: '0600',
      currentTemp: -2,
      maxTemp: 4,
      minTemp: -6,
      precipType: 3,
      sky: 4,
      humidity: 75,
      windSpeed: 3.2,
      fetchedAt: expect.any(String),
    });
    expect(new Date(forecast.fetchedAt).toString()).not.toBe('Invalid Date');
  });

  it('throws ParseError when PTY is missing', () => {
    const withoutPty = buildItems().filter((item) => item.category !== 'PTY');

    expect(() => parseKmaResponse(withoutPty, 60, 127, '06:20')).toThrow(ParseError);
  });

  it('throws ParseError for an unexpected response structure', () => {
    const malformed = [{ category: 'PTY', fcstDate: '20260517', fcstValue: '0' }] as KmaItem[];

    expect(() => parseKmaResponse(malformed, 60, 127, '06:20')).toThrow(ParseError);
  });

  it('uses null for missing TMX and TMN nullable fields', () => {
    const withoutDailyTemps = buildItems().filter(
      (item) => item.category !== 'TMX' && item.category !== 'TMN',
    );

    const forecast = parseKmaResponse(withoutDailyTemps, 60, 127, '06:20');

    expect(forecast.maxTemp).toBeNull();
    expect(forecast.minTemp).toBeNull();
  });
});
