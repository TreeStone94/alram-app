export const TTS_PREFIX_FRIEND = '야~ 일어나!';

export const TEMP_MESSAGES = [
  { minTemp: 28, message: '반팔 한 장이면 충분해요' },
  { minTemp: 20, message: '얇은 긴팔이 딱 좋아요' },
  { minTemp: 12, message: '아침엔 선선하니 가디건 챙기세요' },
  { minTemp: 4, message: '꽤 쌀쌀해요, 코트나 패딩 입으세요' },
  { minTemp: -Infinity, message: '오늘 진짜 추워요, 두꺼운 패딩 필수' },
] as const;

export const DIURNAL_MESSAGE = '낮엔 덥지만 저녁엔 쌀쌀해요, 겉옷 챙기세요';

export const PRECIP_MESSAGES: Record<1 | 2 | 3 | 4, string> = {
  1: '오늘 비 와요, 우산 꼭 챙기세요',
  2: '비나 눈이 섞여 내려요, 우산이랑 미끄럼 조심',
  3: '눈 와요! 미끄러우니까 조심하고 두껍게 입으세요',
  4: '소나기 예보 있어요, 접이식 우산 챙기세요',
};

export const FALLBACK_MESSAGE = '날씨 정보를 가져오지 못했어요. 창문 열어서 직접 확인해보세요!';
