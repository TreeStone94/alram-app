import { findRegion, getSidoList, getSigunguList } from '@/lib/kma-address';
import regions from '@/constants/kma-regions.json';

describe('kma-address', () => {
  it('returns a unique sorted sido list with major cities', () => {
    const list = getSidoList();

    expect(list).toContain('서울특별시');
    expect(list).toContain('부산광역시');
    expect(new Set(list).size).toBe(list.length);
    expect(list).toEqual([...list].sort((a, b) => a.localeCompare(b, 'ko-KR')));
  });

  it('returns a sorted sigungu list for a sido', () => {
    const seoulGu = getSigunguList('서울특별시');

    expect(seoulGu).toContain('강남구');
    expect(seoulGu).toContain('마포구');
    expect(seoulGu).toEqual([...seoulGu].sort((a, b) => a.localeCompare(b, 'ko-KR')));
  });

  it('returns an empty sigungu list for unknown sido', () => {
    expect(getSigunguList('없는시')).toEqual([]);
  });

  it('finds a region by sido and sigungu', () => {
    expect(findRegion('서울특별시', '강남구')).toEqual({
      sido: '서울특별시',
      sigungu: '강남구',
      nx: 61,
      ny: 126,
    });
  });

  it('returns null when a region is not found', () => {
    expect(findRegion('없는시', '없는구')).toBeNull();
  });

  it('ships at least 54 temporary regions', () => {
    expect(regions.length).toBeGreaterThanOrEqual(54);
  });
});
