# 아키텍처

## 디렉토리 구조
```
src/
├── app/                        # Expo Router 페이지
│   ├── _layout.tsx             # 루트 레이아웃, 권한 초기화
│   ├── index.tsx               # 알람 메인 화면
│   ├── alarm-ring.tsx          # 알람 울림/해제 화면
│   ├── settings.tsx            # 설정 화면
│   └── onboarding/
│       ├── _layout.tsx
│       ├── notification.tsx    # 알림 권한 요청
│       ├── location.tsx        # 위치 권한 요청
│       └── silent-mode.tsx     # 무음 모드 안내
├── components/
│   ├── AlarmTimePicker.tsx     # 시간 선택 wheel
│   ├── DayOfWeekToggle.tsx     # 요일별 토글 (월~일)
│   ├── WeatherCard.tsx         # 날씨 요약 카드
│   ├── WeatherBadge.tsx        # 날씨 상태 배지 (아이콘 + 라벨)
│   ├── SlideToDisarm.tsx       # 슬라이드-투-해제 컴포넌트
│   ├── ErrorBanner.tsx         # 상단 에러 배너 (3초 자동 소멸)
│   ├── Toast.tsx               # 하단 Toast 메시지
│   └── LoadingOverlay.tsx      # 전체 화면 로딩
├── services/
│   ├── alarm.ts                # 알람 스케줄러 (expo-notifications 래퍼)
│   ├── weather.ts              # 기상청 API 클라이언트
│   ├── tts.ts                  # TTS 서비스 (TTSProvider 인터페이스)
│   ├── tts-avss.ts             # AVSpeechSynthesizer 구현 (V1)
│   ├── location.ts             # GPS 위치 획득 (expo-location)
│   └── permissions.ts          # 권한 요청/확인 통합
├── tasks/
│   └── weather-refresh.ts      # BackgroundFetch 태스크 (야간 예보 갱신)
├── lib/
│   ├── kma-grid.ts             # WGS84 → 기상청 격자 변환
│   ├── weather-template.ts     # 온도/날씨 → TTS 멘트 생성
│   ├── weather-parser.ts       # 기상청 API 응답 파싱
│   ├── storage.ts              # AsyncStorage 타입 안전 래퍼
│   ├── cache.ts                # TTL 기반 캐시 유틸
│   └── retry.ts                # API 재시도 (exponential backoff)
├── hooks/
│   ├── useAlarm.ts             # 알람 상태 + 액션 (메인 훅)
│   ├── useWeather.ts           # 날씨 데이터 + 로딩/에러 상태
│   └── usePermissions.ts       # 권한 상태 관리
├── constants/
│   ├── weather-codes.ts        # PTY, SKY 코드 상수
│   ├── tts-templates.ts        # 멘트 템플릿 상수
│   └── config.ts               # 앱 설정값 (캐시 TTL, 재시도 횟수 등)
└── types/
    ├── alarm.ts                # AlarmConfig, AlarmState, ScheduleResult
    ├── weather.ts              # WeatherForecast, PrecipType, SkyCondition
    └── tts.ts                  # TTSProvider 인터페이스
```

---

## 핵심 타입 정의

```typescript
// types/alarm.ts
export interface AlarmConfig {
  id: string;                    // UUID
  baseTime: string;              // "HH:mm" (기준 알람 시각)
  earlyMinutes: number;          // 미리 일어나기 분 (기본 20)
  daysOfWeek: DayOfWeek[];       // ['MON', 'TUE', ...] 활성 요일
  enabled: boolean;              // 전체 활성/비활성
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}

export interface ScheduledAlarm {
  config: AlarmConfig;
  scheduledTime: string;         // "HH:mm" (표시용 — 과거/미래 판단에 사용 금지)
  scheduledAt: string;           // ISO 8601 절대 datetime — 단일 진실소스.
  //   scheduledAt이 실제 Notification 발화 시각. 과거/미래 비교, 요일 계산, 복원 판단은 모두 scheduledAt 기준.
  //   scheduledTime은 UI 표시용으로만 사용 (예: "06:20").
  weatherAdjusted: boolean;      // 날씨로 인해 시각 변경됐는지
  precipType: PrecipType | null; // 조정 원인
  notificationId: string;        // expo-notifications 식별자
  schemaVersion: number;         // 1 (AsyncStorage 마이그레이션용. 구조 변경 시 버전 증가)
  forecastSnapshot: WeatherForecast | null; // 스케줄 시점 예보 스냅샷 (TTS 멘트용)
  // 스케줄 당시의 예보를 저장해야 TTS가 "비 때문에 일찍 깨웠는데 맑음" mismatch 방지
}

export type AlarmState =
  | { status: 'idle' }
  | { status: 'scheduling' }
  | { status: 'scheduled'; alarm: ScheduledAlarm }
  | { status: 'ringing'; alarm: ScheduledAlarm }
  | { status: 'dismissed'; alarm: ScheduledAlarm; dismissedAt: string }
  | { status: 'error'; error: AlarmError };

export interface AlarmError {
  code: 'PERMISSION_DENIED' | 'SCHEDULE_FAILED' | 'NOTIFICATION_ERROR';
  message: string;
}

// types/weather.ts
export type PrecipType = 0 | 1 | 2 | 3 | 4;
// 0=없음, 1=비, 2=비/눈, 3=눈, 4=소나기

export type SkyCondition = 1 | 3 | 4;
// 1=맑음, 3=구름많음, 4=흐림

export interface WeatherForecast {
  nx: number;                    // 기상청 격자 X
  ny: number;                    // 기상청 격자 Y
  baseDate: string;              // "YYYYMMDD"
  baseTime: string;              // "HH00"
  currentTemp: number | null;    // 현재 기온 (TMP)
  maxTemp: number | null;        // 일 최고 기온 (TMX)
  minTemp: number | null;        // 일 최저 기온 (TMN)
  precipType: PrecipType;        // 강수형태
  sky: SkyCondition;             // 하늘상태
  humidity: number | null;       // 습도 (REH)
  windSpeed: number | null;      // 풍속 (WSD)
  fetchedAt: string;             // ISO 8601 (캐시 유효성 검사용)
}

export interface WeatherFetchResult {
  data: WeatherForecast | null;
  source: 'api' | 'cache' | 'none';
  error?: WeatherError;
}
// 유효 조합:
// { source: 'api',   data: ..., error: undefined }  — API 성공
// { source: 'cache', data: ..., error: undefined }  — 캐시 HIT
// { source: 'cache', data: ..., error: WeatherError } — API 실패했지만 만료 캐시 사용 (경고)
// { source: 'none',  data: null, error: WeatherError } — 완전 실패 (API 실패 + 캐시 없음)

export interface WeatherError {
  code: 'NETWORK' | 'API_ERROR' | 'PARSE_ERROR' | 'LOCATION_ERROR' | 'RATE_LIMIT';
  message: string;
  statusCode?: number;
}

// types/tts.ts
export interface TTSProvider {
  speak(text: string): Promise<void>;
  stop(): void;
  isAvailable(): boolean;
}
```

---

## 알람 상태 머신

```
[idle]
  → 사용자가 알람 설정 저장
  → [scheduling]
      → 날씨 API 호출 (성공/캐시/실패)
      → Notification 스케줄
      → 성공: [scheduled]
      → 실패: [error]

[scheduled]
  → 스케줄 시각 도래 → Notification 발화
  → 사용자가 탭 → [ringing]
  → 사용자가 알람 비활성화 → Notification 취소 → [idle]
  → 날씨 변경 감지 (BackgroundFetch) → Notification 재스케줄 → [scheduled]

[ringing]
  → 슬라이드-투-해제 → [dismissed]
  → TTS 재생 (비동기, 실패해도 진행)

[dismissed]
  → 다음 날 같은 요일 알람 자동 재스케줄 → [scheduled]
  → 오늘이 마지막 활성 요일 → [idle]

[error]
  → 사용자가 재시도 탭 → [scheduling]
```

---

## 핵심 서비스 스펙

### `services/alarm.ts`

```typescript
interface AlarmService {
  // 알람 스케줄. WeatherForecast를 기반으로 실제 시각 결정.
  schedule(config: AlarmConfig, forecast: WeatherForecast | null): Promise<ScheduledAlarm>;

  // 특정 알람 취소
  cancel(notificationId: string): Promise<void>;

  // 저장된 AlarmConfig로 재스케줄 (앱 실행 시 복원)
  restoreFromStorage(): Promise<ScheduledAlarm | null>;

  // 현재 스케줄된 알람 조회
  getCurrent(): Promise<ScheduledAlarm | null>;
}
```

**알람 시각 계산 로직**:
```
finalTime = config.baseTime
if (forecast.precipType !== 0) {
  finalTime = baseTime - config.earlyMinutes (분 단위 빼기)
  if (finalTime < "00:00") {
    // 자정 이전으로 당겨지는 경우: 전날 시각으로 처리
    // 예: 00:10 - 20분 = 전날 23:50
  }
}
```

**재부팅/업데이트 후 복원**:
- 앱 실행 시 `_layout.tsx`에서 `restoreFromStorage()` 호출
- 저장된 ScheduledAlarm의 `scheduledTime`이 현재 시각 이후이면 재스케줄
- 현재 시각 이전이면 이미 지난 알람 — 다음 활성 요일로 계산 후 재스케줄
- 복원 성공 시: 메인 화면 상단에 5초 배너 "✓ 알람 복구됨. [HH:MM]에 울어요" 표시
- 복원 실패(저장된 알람 없음): 빈 상태 그대로

**알람 해제 후 다음 알람 재스케줄**:
```
[dismissed] → nextAlarm() 호출
  1. 오늘 이후 가장 가까운 활성 daysOfWeek 탐색
  2. 해당 날짜 날씨 API 조회 (캐시 우선)
  3. finalTime 계산 (날씨 반영)
  4. Notification 재스케줄
  5. AsyncStorage 업데이트
  6. index.tsx에 "다음 [요일] [HH:MM]" 표시 갱신
→ 활성 요일 없음: idle 상태, 메인 화면 "알람 없음"
```

**연속 설정 변경 디바운싱**:
- 사용자가 baseTime/earlyMinutes/daysOfWeek 변경 시 1.5초 디바운스 타이머 시작
- 1.5초 내 추가 변경 시 타이머 리셋
- 타이머 만료 시 단일 API 호출 + 스케줄 저장
- 디바운싱 중 서브텍스트에 "날씨 확인 중..." 표시

**요일 변경 시 재스케줄 분기**:
```
사용자가 daysOfWeek 변경 → 1.5초 디바운스 후 reschedule(config) 호출
  nextDate = findNextActiveDay(config.daysOfWeek, startFrom = today)

  판단 순서:
  1. 오늘이 활성 요일 AND 현재 시각 < finalTime → 오늘 날짜로 스케줄 (당일 알람)
  2. 오늘이 비활성이거나 현재 시각 >= finalTime → tomorrow부터 가장 가까운 활성 요일 탐색
  3. 활성 요일 없음 → Notification 취소 + idle 상태

  예시 (수요일 18:00에 수요일 토글 OFF):
    → finalTime = 06:30, 현재 시각 = 18:00 → 오늘 이미 지남
    → 다음 활성 요일(목요일) 06:30으로 재스케줄
  예시 (수요일 05:00에 수요일 토글 ON):
    → finalTime = 06:30, 현재 시각 = 05:00 → 오늘 아직 안 지남
    → 오늘(수요일) 06:30으로 스케줄
```

---

### `services/weather.ts`

```typescript
interface WeatherService {
  // 위치 기반 날씨 조회 (캐시 우선)
  getForecast(lat: number, lon: number): Promise<WeatherFetchResult>;

  // 격자 좌표 기반 날씨 조회
  getForecastByGrid(nx: number, ny: number): Promise<WeatherFetchResult>;

  // 캐시 강제 갱신
  refresh(lat: number, lon: number): Promise<WeatherFetchResult>;

  // 오늘 날씨의 강수 예보 여부
  hasRainOrSnow(forecast: WeatherForecast): boolean;
}
```

**캐시 정리 정책**:
- 앱 실행 시 `weather_cache_*` 패턴으로 오래된 캐시 조회 후 7일 초과 항목 삭제
- AsyncStorage.getAllKeys()로 키 목록 조회 → `weather_cache_` prefix 필터링 → 날짜 파싱 → 7일 초과 키 삭제
- 삭제는 비동기 백그라운드 처리 (앱 시작 UX 블로킹 금지)

**캐시 TTL 정책**:
- TTL은 고정 24h가 아닌 **알람 시각 기준 상대 계산**
- 유효 조건: `fetchedAt + TTL > nextAlarmTime + 2h`
- 예: 알람 06:20, 자정 00:30에 fetch → TTL은 06:20 + 2h = 08:20까지만 유효
- 이유: 고정 24h TTL은 간밤에 fetch한 캐시가 다음 날 저녁까지 유효하다고 판단하는 오류 방지

**API 호출 플로우**:
```
1. 캐시 확인: cache.get(`weather_${nx}_${ny}_${today}`)
   → HIT + TTL 유효 (nextAlarmTime + 2h 기준) → 즉시 반환 (source: 'cache')
   → MISS 또는 TTL 만료 → API 호출로 진행

2. API 호출 (retry.ts로 래핑, 최대 3회, backoff: 1s/2s/4s)
   → 성공 → 파싱 → 캐시 저장 → 반환 (source: 'api')
   → 실패 (3회 모두) → 캐시 (만료된 것도) 반환 시도
   → 캐시도 없음 → 에러 반환 (source: 'none')

3. 기상청 점검 시간 (04:00-04:10) 감지:
   → 현재 시각이 해당 범위이면 API 건너뜀, 캐시 사용
```

---

### `lib/kma-address.ts` (수동 주소 picker 데이터셋)

시/군/구 → KMA 격자 좌표 매핑 데이터셋.

```typescript
// 의존성: 기상청이 제공하는 공식 코드표 (격자 좌표별 행정구역명 목록)
// 소스: 기상청 기상자료개방포털 → 코드표 다운로드 → 전처리 후 JSON 번들
//   URL: https://www.data.go.kr/data/15057281/openapi.do (기상청 격자 코드표)
//   형식: [(시도명, 시군구명, nx, ny)] → src/constants/kma-regions.json 으로 번들
// 주의: 행정구역 개편 시 업데이트 필요 (연 1회 기상청 코드표 확인 권장)

interface KmaRegion {
  sido: string;      // "서울특별시"
  sigungu: string;   // "마포구"
  nx: number;
  ny: number;
}

// 초기 번들: 전국 시/군/구 약 250개 기준
// GPS 권한 거부 시 picker UI에서 sido 선택 → sigungu 필터 → KmaRegion 반환
```

---

### `lib/kma-grid.ts`

기상청 격자 좌표 변환 (Lambert Conformal Conic).

```typescript
interface GridCoord { nx: number; ny: number; }

// WGS84 위경도 → 기상청 격자 좌표
function toKmaGrid(lat: number, lon: number): GridCoord

// 기상청 공식 변환 파라미터
const KMA_PARAMS = {
  Re: 6371.00877,   // 지구 반경 (km)
  grid: 5.0,        // 격자 간격 (km)
  slat1: 30.0,      // 표준위도 1
  slat2: 60.0,      // 표준위도 2
  olon: 126.0,      // 기준점 경도
  olat: 38.0,       // 기준점 위도
  xo: 43,           // 기준점 X 격자
  yo: 136,          // 기준점 Y 격자
};
```

---

### `lib/weather-parser.ts`

기상청 API 응답 파싱. 응답 항목 배열에서 WeatherForecast 객체 생성.

**파싱 로직**:
```
// KMA fcstTime은 1시간 단위 (예: '0600', '0700'). 알람 시각이 06:35이면
// '0635'는 존재하지 않으므로 nearest-hour slot 선택 로직 필수.
function nearestSlot(alarmTime: string, slots: string[]): string {
  // alarmTime "HH:mm" → 분 환산 후 slots 중 가장 가까운 값 반환
  // 예: "06:35" → "0600" (앞뒤 중 가까운 쪽)
}

// 강수 판단은 단일 슬롯이 아닌 시간 윈도우 사용:
// precipWindow(alarmTime): alarmTime - 1h ~ alarmTime + 2h 범위의 모든 fcstTime 슬롯
// hasRainOrSnow = precipWindow 내 PTY != 0인 슬롯이 하나라도 존재하면 true
// 이유: nearestSlot만 보면 새벽 3시 비(alarmTime과 무관)가 early alarm을 불필요하게 트리거할 수 있음

응답 items 배열에서:
- category === 'PTY' && fcstTime in precipWindow(알람시각) → ANY PTY!=0 이면 precipType 기록
- category === 'SKY' && fcstTime === nearestSlot(...) → sky (표시용)
- category === 'TMP' && fcstTime === nearestSlot(...) → currentTemp
- category === 'TMX' → maxTemp (당일 예보 중 최초 1건)
- category === 'TMN' → minTemp (당일 예보 중 최초 1건)
- category === 'REH' && fcstTime === nearestSlot(...) → humidity
- category === 'WSD' && fcstTime === nearestSlot(...) → windSpeed
```

**파싱 실패 처리**:
- 필수 필드(PTY) 없음 → `ParseError` throw
- 숫자 파싱 실패 → `null` (nullable 필드) — 멘트 생성에서 null 처리
- 예상치 못한 응답 구조 → `ParseError` throw + 로컬 로그

---

### `lib/weather-template.ts`

온도/날씨 → TTS 멘트 생성. 완전히 오프라인 동작.

```typescript
interface TemplateInput {
  currentTemp: number | null;
  maxTemp: number | null;
  minTemp: number | null;
  precipType: PrecipType;
  style: 'FRIEND';  // V1 고정
}

function generateScript(input: TemplateInput): string

// 엣지케이스:
// - currentTemp null: 온도 멘트 생략, 강수/일교차만
// - maxTemp, minTemp 둘 다 null: 일교차 계산 불가 → 일교차 멘트 생략
// - 모든 데이터 null: "날씨 정보를 가져오지 못했어요..." fallback 멘트
// - precipType 0 + 정상 기온: 기본 온도 멘트만
// - 일교차 보정 조건: (TMX - TMN) >= 10 AND TMX >= 15 → 영하 날씨에서 "낮엔 덥지만" 방지
```

---

### `lib/storage.ts`

AsyncStorage 타입 안전 래퍼. V1 고정 키 목록:

```typescript
const STORAGE_KEYS = {
  ALARM_CONFIG:    'alarm_config',       // AlarmConfig (V1: 1개 고정 키)
  SCHEDULED_ALARM: 'scheduled_alarm',    // ScheduledAlarm (현재 스케줄)
  LAST_LOCATION:   'last_location',      // { lat, lon, nx, ny } (GPS 캐시)
  MANUAL_ADDRESS:  'manual_address',     // { sido, sigungu, nx, ny } (수동 입력)
  ERROR_LOGS:      'error_logs',         // ErrorLog[] (최대 50건)
} as const;
// 참고: AlarmConfig.id(UUID)는 V2 복수 알람 대비 필드이며, V1에서는 저장 키로 사용하지 않음.
```

---

### `lib/retry.ts`

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts: number;       // 최대 시도 횟수 (기본 3)
    baseDelayMs: number;       // 첫 재시도 대기 (기본 1000ms)
    timeoutMs?: number;        // 단건 요청 타임아웃 (기본 8000ms). AbortController로 구현.
    shouldRetry?: (error: unknown) => boolean;  // 재시도 조건
  }
): Promise<T>

// 타임아웃 동작:
// - 각 시도마다 독립적인 AbortController 생성 (이전 시도의 abort가 다음 시도에 영향 없도록)
// - timeoutMs 내 fn() 미완료 시 → AbortError throw → shouldRetry 검사 없이 재시도
// - 모든 시도 타임아웃 시 → AbortError를 최종 에러로 반환

// 재시도하지 않는 케이스:
// - HTTP 400, 401, 403 (클라이언트 오류) → 재시도 무의미
// - 파싱 오류 → 재시도해도 같은 결과
// 재시도하는 케이스:
// - HTTP 5xx (서버 오류)
// - 네트워크 타임아웃
// - 연결 실패 (ECONNREFUSED 등)
```

---

## 데이터 플로우 전체

### 알람 설정 → 스케줄 저장

```
[index.tsx] 사용자 알람 설정 저장 탭
  ↓
[useAlarm.ts] saveAlarm(config) 호출
  ↓
[services/location.ts] 현재 GPS 위치 획득 (10초 타임아웃)
  → 실패: 저장된 마지막 위치 사용
  → 없음: UI에서 수동 주소 요청
  ↓
[lib/kma-grid.ts] (lat, lon) → {nx, ny}
  ↓
[services/weather.ts] getForecast(nx, ny)
  → 캐시 HIT: 즉시 반환
  → 캐시 MISS: API 호출 (retry 최대 3회)
  → 완전 실패: null 반환 (기본 알람 시간으로 진행)
  ↓
[services/alarm.ts] schedule(config, forecast)
  → finalTime 계산
  → expo-notifications scheduleNotificationAsync
  → ScheduledAlarm 객체 생성
  ↓
[lib/storage.ts] ScheduledAlarm AsyncStorage 저장
  ↓
[useAlarm.ts] state → { status: 'scheduled', alarm }
  ↓
[index.tsx] UI 업데이트 (알람 시각 표시, 날씨 배지)
```

### 알람 울림 → TTS 재생 → 해제

```
[Local Notification 발화]
  ↓
[사용자가 Notification 탭]
  ↓
[Expo Router] alarm-ring.tsx로 딥링크 진행
  → 앱이 killed 상태면 cold start 후 라우팅
  ↓
[alarm-ring.tsx] mount 시:
  1. AsyncStorage에서 ScheduledAlarm 로드
  2. ScheduledAlarm.forecastSnapshot 사용 (스케줄 당시 예보 — 실시간 재조회 금지)
  3. 500ms 딜레이 후 TTS 시작

Cold start 라우팅 (앱 killed 상태에서 알림 탭):
  - _layout.tsx 마운트 직후 Notifications.getLastNotificationResponseAsync() 호출
  - response?.notification 존재 시 router.replace('/alarm-ring') 즉시 실행
  - 타이밍: useEffect 첫 번째 실행에서 처리 (다른 권한 초기화보다 우선)
  - getLastNotificationResponseAsync는 앱 실행 후 짧은 시간만 유효 → 지연 없이 즉시 호출 필수

Foreground 라우팅 (앱이 열려 있는 상태에서 알람 시각 도래):
  - _layout.tsx useEffect에서 Notifications.addNotificationReceivedListener() 등록
  - 콜백: notification.request.content.categoryIdentifier === 'ALARM' 확인 후 router.replace('/alarm-ring')
  - 주의: foreground에서 수신된 notification은 자동 표시되지 않음 → iOS foreground presentation options 설정 필요 없음 (바로 화면 전환)
  - 리스너는 _layout.tsx unmount 시 반드시 구독 해제 (메모리 누수 방지)
  ↓
[services/tts.ts] speak(script)
  → [lib/weather-template.ts] generateScript(forecast) → script
  → [services/tts-avss.ts] AVSpeechSynthesizer.speak(script)
  → 실패: 에러 무시, 화면 유지
  ↓
[SlideToDisarm 컴포넌트] 슬라이드 완료
  → TTS stop()
  → 알람 상태 → 'dismissed'
  → 다음 날 재스케줄 (해당 요일 활성 시)
  → index.tsx로 네비게이션
```

### BackgroundFetch (야간 예보 갱신)

```
[tasks/weather-refresh.ts] iOS OS가 실행 (보장 없음)
  ↓
[AsyncStorage] 현재 ScheduledAlarm 로드
  → 없음: 태스크 종료 (알람 설정 안 됨)
  ↓
[services/weather.ts] API 호출 (캐시 무시, 강제 갱신)
  → 실패: 기존 스케줄 유지, 태스크 종료
  ↓
[기존 스케줄 vs 새 예보 비교]
  → 강수 상태 동일: 변경 없음
  → 강수 상태 변경됨:
      → 기존 Notification 취소
      → 새 시각 계산
      → 새 Notification 스케줄
      → ScheduledAlarm.forecastSnapshot ← 새 WeatherForecast로 업데이트 (TTS용)
      → AsyncStorage 업데이트 (ScheduledAlarm 전체 — forecastSnapshot 포함)
```

---

## 에러 처리 전략

### 원칙
1. **알람 신뢰성 > 날씨 정확성**: API 실패는 기본 알람 시간으로 안전하게 폴백
2. **TTS 실패는 무음 처리**: 알람 해제 UX를 방해하지 않음
3. **사용자에게 에러 표시**: 단, 알람 해제 화면에서는 에러 배너 금지
4. **로컬 에러 로그**: 모든 API/파싱 오류는 AsyncStorage에 로그 (디버깅용)

### 에러 계층

```
앱 레벨 에러 (전체 화면 표시)
  - 알림 권한 없음
  - 위치 권한 거부 → 수동 주소 입력 화면

피처 레벨 에러 (배너/Toast)
  - 날씨 API 실패 → 배너 "날씨 확인 실패, 기본 시간으로 설정"
  - 알람 스케줄 실패 → Toast "알람 설정 실패, 재시도해주세요"

무음 처리 에러 (사용자 노출 없음)
  - TTS 실패 → 화면 날씨 카드만 표시
  - BackgroundFetch 내 API 실패 → 기존 스케줄 유지
  - 캐시 읽기 실패 → null로 처리 후 API 재시도
```

### 에러 로깅

```typescript
// lib/error-log.ts
interface ErrorLog {
  timestamp: string;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

// AsyncStorage key: 'error_logs'
// 최대 50건 보관, FIFO
// 설정 화면에서 개발자 모드 진입 시 조회 가능 (베타 전용)
```

---

## 권한 처리 플로우

```typescript
// hooks/usePermissions.ts
interface PermissionState {
  notification: 'granted' | 'denied' | 'undetermined';
  location: 'granted' | 'denied' | 'undetermined';
}

// _layout.tsx 마운트 시 실행 순서 (순서 중요):
// 0. [최우선] getLastNotificationResponseAsync() — cold start 알람 탭 감지 (지연 없이 즉시)
//    → 응답 있으면 router.replace('/alarm-ring') 즉시. 이후 초기화 불필요.
// 1. addNotificationReceivedListener() 등록 — foreground 알람 수신 감지
// 2. Promise.all([checkNotificationPermission(), checkLocationPermission()]) — 병렬 처리
// 3. notification undetermined → /onboarding/notification 라우팅
// 4. notification denied → 메인 화면 상단 고정 배너 + 알람 컨트롤 비활성
//    (앱 포그라운드 복귀 시마다 권한 상태 재확인 → 허용 시 자동 해제)
// 5. location undetermined → /onboarding/location 라우팅 (온보딩 Step 2에서 처리)
//    주의: 알람 설정 시도 시가 아닌 온보딩 플로우에서 요청 (PRD §3 기준)
// 6. location denied → 수동 주소 입력 모드 활성 (onboarding/location에서 picker 제공)
// 7. restoreFromStorage() — 재부팅/업데이트 후 알람 복원
// 성능 주의: 0번은 절대 다른 작업과 병렬 처리하지 말 것 (응답 유효 시간 짧음)
```

---

## 환경변수 관리

```javascript
// app.config.js
export default {
  expo: {
    extra: {
      kmaApiKey: process.env.KMA_API_KEY,
    },
  },
};

// eas.json
{
  "build": {
    "development": { "env": { "KMA_API_KEY": "@kma-api-key-dev" } },
    "production": { "env": { "KMA_API_KEY": "@kma-api-key-prod" } }
  }
}

// 사용
import Constants from 'expo-constants';
const API_KEY = Constants.expoConfig?.extra?.kmaApiKey;
if (!API_KEY) throw new Error('KMA_API_KEY 환경변수 없음');
```

**절대 금지**: API 키를 코드에 하드코딩하거나 AsyncStorage에 저장 금지.

---

## 테스트 전략

### 단위 테스트 (Jest + @testing-library/react-native)

| 대상 | 테스트 케이스 |
|------|-------------|
| `lib/kma-grid.ts` | 서울 좌표 → (60, 127) 변환, 제주도, 강원도 경계값 |
| `lib/kma-grid.ts` | 음수/해외 좌표 입력 → 명확한 오류 또는 경계 처리 |
| `lib/weather-template.ts` | 각 온도 구간별 멘트, null 입력, PTY 조합 |
| `lib/weather-template.ts` | 일교차 보정: TMX >= 15 AND 차이 >= 10 → 멘트 포함. TMX < 15 → 멘트 생략 |
| `lib/weather-parser.ts` | 정상 응답 파싱, 필드 누락, 비정상 구조 |
| `lib/weather-parser.ts` | `nearestSlot()`: "06:35" → "0600", "06:50" → "0700", "00:05" → "0000" 자정 경계 |
| `lib/retry.ts` | 1회 실패 후 성공, 3회 모두 실패, 400은 재시도 안함 |
| `lib/retry.ts` | `timeoutMs`: AbortError 발생 → 재시도 카운트 포함. 3회 모두 타임아웃 → AbortError 최종 반환 |
| `lib/cache.ts` | TTL 이내 HIT, TTL 초과 MISS, 키 불일치 |
| `lib/cache.ts` | alarm-time-relative TTL: `fetchedAt + TTL > nextAlarmTime + 2h` 경계값 (초과/이내/정확히 경계) |
| `services/alarm.ts` (알람 시각 계산) | 강수 있음/없음, 자정 역행, 기본값 |
| `services/alarm.ts` (forecastSnapshot) | `schedule()` 반환 ScheduledAlarm.forecastSnapshot === 입력 forecast |
| `services/alarm.ts` (restore) | `restoreFromStorage()`: 미래 알람 → 재스케줄, 지난 알람 → 다음 요일 계산 |
| `services/alarm.ts` (nextAlarm) | `nextAlarm()`: 오늘 이후 첫 활성 요일 계산, 활성 요일 없음 → null 반환 |

### 통합 테스트

| 시나리오 | 검증 항목 |
|----------|---------|
| 알람 설정 → 스케줄 저장 | Notification ID AsyncStorage 저장 확인 |
| 알람 설정 → forecastSnapshot 저장 | ScheduledAlarm.forecastSnapshot이 null이 아닌지 확인 |
| API 실패 시 기본 알람 | fallback 로직 동작 확인 |
| 캐시 HIT | API 미호출 확인 |
| BackgroundFetch 재스케줄 | 강수 변경 시 forecastSnapshot도 함께 업데이트되는지 확인 |
| alarm-time-relative TTL 경계 | 알람 시각 30분 전에 fetch → TTL HIT, 알람 시각 + 3h 후 fetch → MISS |

### 수동 테스트 (실기기 필수)

| 케이스 | 검증 방법 |
|--------|---------|
| Local Notification 탭 → alarm-ring 진입 | 실기기에서 직접 확인 |
| 앱 killed 상태 알람 → cold start | 앱 완전 종료 후 알람 시간 대기 |
| 앱 foreground 상태에서 알람 시각 도래 → alarm-ring 자동 전환 | 앱 열어둔 채로 알람 시각 대기 |
| 스누즈 버튼 미표시 확인 | Notification 수신 후 잠금화면에서 스누즈 버튼 없음 확인 |
| 무음 모드 알람 | 무음 설정 후 알람 발화 확인 |
| 무음 모드 진동 여부 | 무음 설정 후 알람 발화 → 진동 여부 확인 |
| Focus/DND 모드에서 notification 도달 여부 | DND 설정 후 notification 수신 확인 |
| 잠금 화면/killed 상태/Low Power Mode 조합 | 각 조합에서 notification 도달 + 탭 → alarm-ring 확인 |
| 폰 재부팅 후 알람 복원 | 재부팅 후 앱 실행 → 알람 상태 확인 |
| BackgroundFetch 동작 | Xcode에서 시뮬레이션 |
| TTS 60초 후 [건너뛰기] 버튼 노출 | 알람 해제 화면에서 60초 대기 후 버튼 확인 |
| [CRITICAL POC] expo-speech vs AVSpeechSynthesizer stop() 제어 | expo-speech로 TTS 시작/정지가 가능한지. stop() 없으면 SlideToDisarm 후 TTS 중단 불가 → bare workflow 전환 결정 필요 |
| 알람음 커스텀 가능 여부 | expo-notifications에서 Clock 앱 알람음 사용 가능한지 확인 |

---

## iOS 제약 사항 요약

| 제약 | 영향 | 대응 |
|------|------|------|
| Local Notification 무음 모드 | 알람 소리 없음 | 온보딩 안내, Critical Alerts 신청 |
| BackgroundFetch 실행 시각 제어 불가 | 야간 갱신 불확실 | 설정 시점 스케줄이 주 메커니즘 |
| 재부팅 후 자동 실행 없음 | 앱 실행 전까지 복원 불가 | 온보딩 안내, 앱 실행 시 즉시 복원 |
| Background Audio 없음 | TTS 백그라운드 재생 불가 | foreground 진입 후에만 TTS |
| Notification 스케줄 최대 64개 | 복수 알람 V2에서 제약 | V1은 1개 → 무관 |
