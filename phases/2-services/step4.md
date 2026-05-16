# Step 4: hooks

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "hooks/" 섹션, 알람 상태 머신, 데이터 플로우 "알람 설정 → 스케줄 저장"
- `/docs/PRD.md` — §5 다음 알람 표시, §1 연속 설정 변경 디바운싱
- `/CLAUDE.md`
- `src/types/alarm.ts`, `src/types/weather.ts`
- `src/services/alarm.ts`, `src/services/weather.ts`, `src/services/location.ts`, `src/services/permissions.ts`
- `src/constants/config.ts` — ALARM_CONFIG.debounceMs

## 작업

서비스 레이어를 감싸는 React 훅 3개를 구현한다.

### `src/hooks/useAlarm.ts`

알람 상태 관리 + 액션 (메인 훅).

```typescript
import type { AlarmConfig, AlarmState } from '@/types/alarm';

interface UseAlarmReturn {
  state: AlarmState;
  saveAlarm: (config: AlarmConfig) => Promise<void>;
  // 1. GPS 위치 획득 → nx, ny 계산
  // 2. weatherService.getForecast(nx, ny)
  // 3. alarmService.schedule(config, forecast)
  // 4. state → 'scheduled'

  cancelAlarm: () => Promise<void>;
  // alarmService.cancel → state → 'idle'

  dismissAlarm: () => Promise<void>;
  // alarmService 상태 → 'dismissed'
  // 다음 활성 요일 재스케줄 (nextAlarm)

  restoreAlarm: () => Promise<void>;
  // alarmService.restoreFromStorage()

  nextAlarmLabel: string | null;
  // "다음 [요일] [HH:MM]" 형식 (dismissed 후 갱신)
  // 활성 요일 없으면 null

  isDebouncing: boolean;
  // 설정 변경 후 1.5초 디바운스 중이면 true → UI에서 "날씨 확인 중..." 표시
}

export function useAlarm(): UseAlarmReturn
```

**디바운싱 규칙** (ARCHITECTURE.md):
- AlarmConfig 변경 시 1.5초(ALARM_CONFIG.debounceMs) 타이머 시작
- 1.5초 내 추가 변경 시 타이머 리셋
- 타이머 만료 시 saveAlarm 실행
- 디바운싱 중 isDebouncing=true

### `src/hooks/useWeather.ts`

날씨 데이터 + 로딩/에러 상태.

```typescript
import type { WeatherForecast, WeatherError } from '@/types/weather';

interface UseWeatherReturn {
  forecast: WeatherForecast | null;
  isLoading: boolean;
  error: WeatherError | null;
  refresh: () => Promise<void>;
  // weatherService.refresh(lat, lon) 호출
}

export function useWeather(nx: number | null, ny: number | null): UseWeatherReturn
```

### `src/hooks/usePermissions.ts`

권한 상태 관리.

```typescript
import type { PermissionState, PermissionStatus } from '@/services/permissions';

interface UsePermissionsReturn {
  permissions: PermissionState;
  requestNotification: () => Promise<PermissionStatus>;
  requestLocation: () => Promise<PermissionStatus>;
  recheckPermissions: () => Promise<void>;
  // 앱 포그라운드 복귀 시 호출 → checkNotificationPermission, checkLocationPermission 재확인
  openSettings: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn
```

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=hooks
```

테스트 파일 `src/__tests__/hooks/useAlarm.test.ts`:
- saveAlarm 호출 → state가 'scheduling' → 'scheduled' 전환 확인
- saveAlarm 중 에러 → state → 'error' 전환 확인
- 디바운싱: config 변경 후 1.5초 전에는 API 미호출, 1.5초 후 호출 확인

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. useAlarm의 saveAlarm에서 state가 `scheduling` → `scheduled` 순서로 전환되는지 테스트로 확인한다.
3. 결과에 따라 `phases/2-services/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/hooks/ 3개 (useAlarm, useWeather, usePermissions) 구현. AlarmState 머신, 1.5s 디바운싱, 다음알람 레이블. 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- Zustand, Jotai, Redux 등 전역 상태 라이브러리를 설치하지 마라. 이유: ADR-009 — AsyncStorage + React state로 충분.
- 날씨 API를 디바운스 없이 매 config 변경마다 직접 호출하지 마라. 이유: 요일 토글 빠르게 여러 번 변경 시 과도한 API 호출 발생.
- useAlarm에서 TTS를 직접 호출하지 마라. 이유: TTS는 alarm-ring.tsx에서만 실행 (foreground 진입 후).
