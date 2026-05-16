import type { PrecipType, SkyCondition } from '@/types/weather';

export const PTY_LABELS: Record<PrecipType, string> = {
  0: '없음',
  1: '비',
  2: '비/눈',
  3: '눈',
  4: '소나기',
};

export const SKY_LABELS: Record<SkyCondition, string> = {
  1: '맑음',
  3: '구름많음',
  4: '흐림',
};

export const SKY_ICONS: Record<SkyCondition, string> = {
  1: '☀️',
  3: '⛅',
  4: '☁️',
};

export const PTY_ICONS: Record<PrecipType, string> = {
  0: '',
  1: '🌧',
  2: '🌨',
  3: '❄️',
  4: '🌦',
};
