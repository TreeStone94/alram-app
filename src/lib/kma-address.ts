import regions from '@/constants/kma-regions.json';

export interface KmaRegion {
  sido: string;
  sigungu: string;
  nx: number;
  ny: number;
}

const KOREAN_LOCALE = 'ko-KR';
const kmaRegions: KmaRegion[] = regions;

function sortKorean(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, KOREAN_LOCALE));
}

export function getSidoList(): string[] {
  return sortKorean([...new Set(kmaRegions.map((region) => region.sido))]);
}

export function getSigunguList(sido: string): string[] {
  return sortKorean(
    kmaRegions
      .filter((region) => region.sido === sido)
      .map((region) => region.sigungu),
  );
}

export function findRegion(sido: string, sigungu: string): KmaRegion | null {
  return kmaRegions.find((region) => region.sido === sido && region.sigungu === sigungu) ?? null;
}
