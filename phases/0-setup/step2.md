# Step 2: constants-storage

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "lib/storage.ts", "에러 로깅" 섹션
- `/docs/PRD.md` — TTS 멘트 규칙, 온도 구간, PTY/SKY 코드
- `/CLAUDE.md`
- `src/types/alarm.ts`, `src/types/weather.ts` — 이전 step에서 생성된 타입

## 작업

상수 파일 3개와 유틸 라이브러리 2개를 생성한다.

### `src/constants/config.ts`

앱 전체에서 사용하는 설정 상수:

```typescript
export const CURRENT_SCHEMA_VERSION = 1;

export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,    // 첫 재시도 대기 (1s → 2s → 4s)
  timeoutMs: 8000,      // 단건 요청 타임아웃
} as const;

export const CACHE_CONFIG = {
  fallbackTtlMs: 4 * 60 * 60 * 1000,  // BackgroundFetch 기본 TTL: 4시간
  cleanupThresholdDays: 7,             // 7일 초과 캐시 삭제
} as const;

export const ALARM_CONFIG = {
  defaultEarlyMinutes: 20,
  defaultDaysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const,
  debounceMs: 1500,        // 설정 변경 디바운스
  locationTimeoutMs: 10000,
} as const;

export const TTS_CONFIG = {
  startDelayMs: 500,       // 화면 렌더링 후 TTS 시작 딜레이
  timeoutMs: 60000,        // 60초 초과 시 [건너뛰기] 버튼 노출
} as const;

export const KMA_MAINTENANCE = {
  startHour: 4,
  startMinute: 0,
  endHour: 4,
  endMinute: 10,
} as const;
```

### `src/constants/weather-codes.ts`

기상청 PTY/SKY 코드 매핑:

```typescript
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
```

### `src/constants/tts-templates.ts`

TTS 멘트 템플릿 (PRD §2 TTS 멘트 생성 규칙 기준):

```typescript
// FRIEND 스타일 prefix
export const TTS_PREFIX_FRIEND = '야~ 일어나!';

// 온도 구간 멘트 (기온 TMP 기준)
export const TEMP_MESSAGES = [
  { minTemp: 28, message: '반팔 한 장이면 충분해요' },
  { minTemp: 20, message: '얇은 긴팔이 딱 좋아요' },
  { minTemp: 12, message: '아침엔 선선하니 가디건 챙기세요' },
  { minTemp: 4,  message: '꽤 쌀쌀해요, 코트나 패딩 입으세요' },
  { minTemp: -Infinity, message: '오늘 진짜 추워요, 두꺼운 패딩 필수' },
] as const;

// 일교차 경고 멘트
export const DIURNAL_MESSAGE = '낮엔 덥지만 저녁엔 쌀쌀해요, 겉옷 챙기세요';

// PTY별 추가 멘트
export const PRECIP_MESSAGES: Record<1 | 2 | 3 | 4, string> = {
  1: '오늘 비 와요, 우산 꼭 챙기세요',
  2: '비나 눈이 섞여 내려요, 우산이랑 미끄럼 조심',
  3: '눈 와요! 미끄러우니까 조심하고 두껍게 입으세요',
  4: '소나기 예보 있어요, 접이식 우산 챙기세요',
};

// 완전 실패 시 fallback 멘트
export const FALLBACK_MESSAGE = '날씨 정보를 가져오지 못했어요. 창문 열어서 직접 확인해보세요!';
```

### `src/lib/storage.ts`

AsyncStorage 타입 안전 래퍼. schemaVersion 마이그레이션 포함.

인터페이스:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlarmConfig } from '@/types/alarm';
import type { ScheduledAlarm } from '@/types/alarm';
import type { WeatherForecast } from '@/types/weather';
import { CURRENT_SCHEMA_VERSION } from '@/constants/config';

export const STORAGE_KEYS = {
  ALARM_CONFIG:    'alarm_config',
  SCHEDULED_ALARM: 'scheduled_alarm',
  LAST_LOCATION:   'last_location',
  MANUAL_ADDRESS:  'manual_address',
  ERROR_LOGS:      'error_logs',
} as const;

export type LastLocation = { lat: number; lon: number; nx: number; ny: number };
export type ManualAddress = { sido: string; sigungu: string; nx: number; ny: number };

// 타입 안전 get/set/remove 헬퍼
async function getItem<T>(key: string): Promise<T | null>
async function setItem<T>(key: string, value: T): Promise<void>
async function removeItem(key: string): Promise<void>

// 각 도메인별 accessor
export const storage = {
  alarmConfig: {
    get(): Promise<AlarmConfig | null>,
    set(config: AlarmConfig): Promise<void>,
    remove(): Promise<void>,
  },
  scheduledAlarm: {
    get(): Promise<ScheduledAlarm | null>,
    set(alarm: ScheduledAlarm): Promise<void>,
    remove(): Promise<void>,
  },
  lastLocation: {
    get(): Promise<LastLocation | null>,
    set(loc: LastLocation): Promise<void>,
  },
  manualAddress: {
    get(): Promise<ManualAddress | null>,
    set(addr: ManualAddress): Promise<void>,
  },
};

// ScheduledAlarm schemaVersion 마이그레이션 헬퍼
// 저장된 schemaVersion이 CURRENT_SCHEMA_VERSION보다 낮으면 변환 후 재저장
export async function migrateScheduledAlarm(alarm: ScheduledAlarm): Promise<ScheduledAlarm>
```

구현 규칙:
- JSON.stringify/JSON.parse 사용
- 파싱 실패 시 null 반환 (throw 금지)
- `migrateScheduledAlarm`은 현재 schemaVersion=1이므로 버전 낮은 경우 `schemaVersion: 1`로 올리고 재저장

### `src/lib/error-log.ts`

로컬 에러 로그 (최대 50건 FIFO):

```typescript
import type { ErrorLog } from '@/lib/error-log';  // 자기 참조 방지, 인터페이스 동일 파일 정의

export interface ErrorLog {
  timestamp: string;   // ISO 8601
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export async function appendErrorLog(entry: Omit<ErrorLog, 'timestamp'>): Promise<void>
// AsyncStorage 'error_logs' 키에서 기존 로그 읽기 → 새 항목 추가 → 50건 초과 시 오래된 것 FIFO 제거 → 저장

export async function getErrorLogs(): Promise<ErrorLog[]>
// 저장된 에러 로그 전체 반환. 파싱 실패 시 빈 배열 반환.

export async function clearErrorLogs(): Promise<void>
```

## Acceptance Criteria

```bash
npm run typecheck   # 타입 에러 없음
npm test            # 테스트 없어도 통과 (--passWithNoTests)
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아래 항목을 확인한다:
   - `STORAGE_KEYS`의 키가 ARCHITECTURE.md 명세(`alarm_config`, `scheduled_alarm`, `last_location`, `manual_address`, `error_logs`)와 일치하는가?
   - `CURRENT_SCHEMA_VERSION`이 `1`로 정의됐는가?
   - `TEMP_MESSAGES`의 온도 구간이 PRD §2 기준과 일치하는가?
   - `PRECIP_MESSAGES`가 PTY 1,2,3,4를 모두 커버하는가?
3. 결과에 따라 `phases/0-setup/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/constants/ 3개, src/lib/storage.ts, src/lib/error-log.ts 생성. STORAGE_KEYS, schemaVersion 마이그레이션 포함. typecheck 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- `STORAGE_KEYS`의 값(문자열)을 ARCHITECTURE.md 명세와 다르게 변경하지 마라. 이유: 다른 step의 get/set 코드가 이 키를 직접 참조한다.
- TTS 멘트 내용(온도 구간, PTY 멘트)을 PRD와 다르게 변경하지 마라. 이유: PRD가 확정된 UX 스펙이다.
- AsyncStorage 파싱 실패 시 throw하지 마라. 이유: 저장 데이터 손상이 앱 크래시로 이어지면 안 됨.
- API 키를 이 파일들에 포함하지 마라. 이유: 환경변수로만 관리 (CLAUDE.md CRITICAL).
