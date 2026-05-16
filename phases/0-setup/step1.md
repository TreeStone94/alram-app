# Step 1: type-defs

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "핵심 타입 정의" 섹션 (정확한 타입 명세)
- `/docs/PRD.md` — PTY/SKY 코드, TTS 스타일, 에러 케이스
- `/CLAUDE.md`
- `src/app/_layout.tsx` — 이전 step에서 생성된 파일

## 작업

`src/types/` 디렉토리에 TypeScript 타입 정의 파일 3개를 생성한다.
ARCHITECTURE.md의 "핵심 타입 정의" 섹션을 그대로 따른다. 임의 변경 금지.

### `src/types/alarm.ts`

아래 항목을 모두 포함한다:

```typescript
export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface AlarmConfig {
  id: string;           // UUID
  baseTime: string;     // "HH:mm"
  earlyMinutes: number; // 기본 20
  daysOfWeek: DayOfWeek[];
  enabled: boolean;
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}

export interface ScheduledAlarm {
  config: AlarmConfig;
  scheduledTime: string;    // "HH:mm" — UI 표시 전용. 과거/미래 비교에 사용 금지.
  scheduledAt: string;      // ISO 8601 절대 datetime — 단일 진실소스
  weatherAdjusted: boolean;
  precipType: PrecipType | null;
  notificationId: string;
  schemaVersion: number;    // 1
  forecastSnapshot: WeatherForecast | null;
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
```

`ScheduledAlarm`에서 `WeatherForecast`를 import해야 하므로 `../types/weather`를 참조한다.

### `src/types/weather.ts`

```typescript
export type PrecipType = 0 | 1 | 2 | 3 | 4;
// 0=없음, 1=비, 2=비/눈, 3=눈, 4=소나기

export type SkyCondition = 1 | 3 | 4;
// 1=맑음, 3=구름많음, 4=흐림

export interface WeatherForecast {
  nx: number;
  ny: number;
  baseDate: string;        // "YYYYMMDD"
  baseTime: string;        // "HH00"
  currentTemp: number | null;
  maxTemp: number | null;
  minTemp: number | null;
  precipType: PrecipType;
  sky: SkyCondition;
  humidity: number | null;
  windSpeed: number | null;
  fetchedAt: string;       // ISO 8601
}

export interface WeatherFetchResult {
  data: WeatherForecast | null;
  source: 'api' | 'cache' | 'none';
  error?: WeatherError;
}

export interface WeatherError {
  code: 'NETWORK' | 'API_ERROR' | 'PARSE_ERROR' | 'LOCATION_ERROR' | 'RATE_LIMIT';
  message: string;
  statusCode?: number;
}
```

### `src/types/tts.ts`

```typescript
export interface TTSProvider {
  speak(text: string): Promise<void>;
  stop(): void;
  isAvailable(): boolean;
}
```

## Acceptance Criteria

```bash
npm run typecheck   # 타입 에러 없음 (exit 0)
```

## 검증 절차

1. `npm run typecheck`를 실행한다.
2. 아래 항목을 확인한다:
   - `ScheduledAlarm.scheduledAt`이 string(ISO 8601)으로 정의됐는가?
   - `ScheduledAlarm.schemaVersion`이 number로 포함됐는가?
   - `ScheduledAlarm.forecastSnapshot`이 `WeatherForecast | null`인가?
   - `AlarmState`가 union type으로 정의됐는가?
   - `PrecipType`이 `0 | 1 | 2 | 3 | 4` literal union인가?
3. 결과에 따라 `phases/0-setup/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/types/ 생성 완료 (alarm.ts, weather.ts, tts.ts). typecheck 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- ARCHITECTURE.md의 타입 명세를 임의로 변경하지 마라. 이유: 이후 step들이 이 타입을 그대로 사용한다.
- `scheduledTime`을 과거/미래 비교 로직에 사용하지 마라. 이유: `scheduledAt`이 단일 진실소스 (ARCHITECTURE.md 주석 참조).
- `src/types/` 외 경로에 타입을 선언하지 마라. 이유: CLAUDE.md 파일 구조 규칙.
- 이 step에서 서비스, 컴포넌트, 훅 파일을 만들지 마라. 이유: 이 step의 범위는 순수 타입 정의만.
