import { toKmaGrid } from '@/lib/kma-grid';

describe('toKmaGrid', () => {
  it('converts Seoul center coordinates to the KMA grid', () => {
    expect(toKmaGrid(37.5665, 126.9780)).toEqual({ nx: 60, ny: 127 });
  });

  it('converts Jeju city coordinates to the KMA grid', () => {
    expect(toKmaGrid(33.4996, 126.5312)).toEqual({ nx: 52, ny: 38 });
  });

  it('converts Busan Haeundae coordinates to the KMA grid', () => {
    expect(toKmaGrid(35.1631, 129.1636)).toEqual({ nx: 99, ny: 75 });
  });

  it('converts Gangneung east coast coordinates to the KMA grid', () => {
    expect(toKmaGrid(37.7519, 128.8761)).toEqual({ nx: 92, ny: 131 });
  });

  it('returns numeric grid coordinates for overseas negative latitudes', () => {
    expect(() => toKmaGrid(-33.8688, 151.2093)).not.toThrow();

    const coord = toKmaGrid(-33.8688, 151.2093);

    expect(Number.isFinite(coord.nx)).toBe(true);
    expect(Number.isFinite(coord.ny)).toBe(true);
  });
});
