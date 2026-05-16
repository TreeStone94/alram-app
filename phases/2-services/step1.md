# Step 1: weather-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "services/weather.ts" 섹션 (캐시 TTL 정책, API 플로우, 점검 시간 처리, 캐시 정리)
- `/docs/PRD.md` — "날씨 API 상세 스펙" 섹션 (엔드포인트, 파라미터, base_time 계산)
- `/docs/ADR.md` — ADR-005, ADR-008
- `/CLAUDE.md`
- `src/types/weather.ts`
- `src/lib/kma-grid.ts`, `src/lib/weather-parser.ts`, `src/lib/retry.ts`, `src/lib/cache.ts`
- `src/constants/config.ts`
- `src/lib/storage.ts`
- `src/lib/error-log.ts`

## 작업

기상청 단기예보 API 클라이언트를 구현한다. 캐시, 재시도, 점검 시간 처리가 포함된다.

### `src/services/weather.ts`

```typescript
import type { WeatherFetchResult } from '@/types/weather';

export interface WeatherService {
  // 위치 기반 날씨 조회 (캐시 우선)
  getForecast(lat: number, lon: number, alarmTime?: string): Promise<WeatherFetchResult>;

  // 격자 좌표 기반 날씨 조회
  getForecastByGrid(nx: number, ny: number, alarmTime?: string): Promise<WeatherFetchResult>;

  // 캐시 강제 갱신
  refresh(lat: number, lon: number): Promise<WeatherFetchResult>;

  // 오늘 날씨의 강수 예보 여부
  hasRainOrSnow(forecast: import('@/types/weather').WeatherForecast): boolean;
}

export const weatherService: WeatherService = { ... };
```

**API 호출 플로우 (ARCHITECTURE.md 기준)**:

```
1. 기상청 점검 시간(04:00-04:10) 확인
   → 현재 시각이 범위 내이면 API 건너뜀, 캐시만 사용 (만료됐어도)

2. 캐시 확인: AsyncStorage key = makeCacheKey(nx, ny, today)
   → HIT + isAlarmTimeTtlValid() → 즉시 반환 (source: 'cache')
   → MISS 또는 TTL 만료 → API 호출로 진행

3. API 호출 (withRetry 래핑, RETRY_CONFIG 사용)
   → 성공 → parseKmaResponse() → 캐시 저장 → 반환 (source: 'api')
   → 실패 (3회 모두) → 만료 캐시라도 있으면 반환 (source: 'cache', error 포함)
   → 캐시도 없음 → 에러 반환 (source: 'none', error 포함)
```

**KMA API 엔드포인트**:
```
https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst
파라미터: serviceKey, numOfRows=300, pageNo=1, dataType=JSON, base_date, base_time, nx, ny
```

**base_time 계산**:
- 매일 8회 발표: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
- 현재 시각보다 이전인 발표 시각 중 가장 최근 것 선택
- 예: 06:30이면 → 0500 사용 (0800은 아직 발표 전)

**API 키 조회**:
```typescript
import Constants from 'expo-constants';
const apiKey = Constants.expoConfig?.extra?.kmaApiKey;
if (!apiKey) throw new Error('KMA_API_KEY 환경변수 없음');
```

**캐시 정리** (7일 초과 항목):
- `AsyncStorage.getAllKeys()` → `weather_cache_` prefix 필터 → 날짜 파싱 → 7일 초과 삭제
- 비동기 백그라운드 처리 (await 없이 실행, 앱 시작 블로킹 금지)

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=weather-service
```

테스트 파일 `src/__tests__/services/weather.test.ts` 작성 필수:
- 캐시 HIT → API 미호출 확인 (fetch mock이 호출되지 않아야)
- API 실패 시 만료 캐시 반환 (source: 'cache', error 포함)
- 점검 시간(04:05) → API 건너뜀
- base_time 계산: 06:30 → '0500'

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. API 호출 시 `KMA_API_KEY`가 하드코딩되지 않고 `Constants.expoConfig.extra.kmaApiKey`에서 조회되는지 코드를 확인한다.
3. 결과에 따라 `phases/2-services/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/services/weather.ts 구현. getForecast/getForecastByGrid/refresh. 캐시TTL, 점검시간(04:00-04:10), 7일 캐시정리, withRetry 통합. 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- `KMA_API_KEY`를 코드에 하드코딩하지 마라. 이유: CLAUDE.md CRITICAL, ADR-003. `Constants.expoConfig?.extra?.kmaApiKey`로만 조회.
- 캐시 정리를 앱 시작 흐름에서 await로 실행하지 마라. 이유: 7일치 키 조회는 느릴 수 있어 시작 UX를 블로킹한다.
- API 실패 시 즉시 에러를 반환하지 마라. 이유: 3회 재시도 후 만료 캐시라도 있으면 반환하는 게 알람 신뢰성 원칙 (CLAUDE.md: "알람 신뢰성 > 날씨 정확성").
- `fetch()`를 jest 테스트에서 실제로 호출하지 마라. 이유: 네트워크 없는 CI 환경에서 실패한다. `global.fetch`를 jest.mock 또는 jest.spyOn으로 모킹.
