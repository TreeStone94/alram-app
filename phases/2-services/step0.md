# Step 0: alarm-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "services/alarm.ts" 섹션 (AlarmService 인터페이스, 알람 시각 계산, 복원 로직, 요일 변경 분기)
- `/docs/PRD.md` — §1 날씨 연동 스마트 알람 엣지케이스 (자정 역행, 재부팅 복원, 다음 알람 재스케줄)
- `/CLAUDE.md`
- `src/types/alarm.ts`, `src/types/weather.ts`
- `src/constants/config.ts`
- `src/lib/storage.ts`

## 작업

`src/services/alarm.ts`를 구현한다. expo-notifications 래퍼이자 알람 스케줄러 역할이다.

### `src/services/alarm.ts`

```typescript
import * as Notifications from 'expo-notifications';
import type { AlarmConfig, ScheduledAlarm, DayOfWeek } from '@/types/alarm';
import type { WeatherForecast } from '@/types/weather';

export interface AlarmService {
  // 알람 스케줄. WeatherForecast를 기반으로 실제 시각 결정.
  // forecastSnapshot은 ScheduledAlarm에 그대로 저장 (TTS 멘트용)
  schedule(config: AlarmConfig, forecast: WeatherForecast | null): Promise<ScheduledAlarm>;

  // 특정 알람 취소
  cancel(notificationId: string): Promise<void>;

  // 저장된 AlarmConfig로 재스케줄 (앱 실행 시 복원)
  restoreFromStorage(): Promise<ScheduledAlarm | null>;

  // 현재 스케줄된 알람 조회
  getCurrent(): Promise<ScheduledAlarm | null>;
}

export const alarmService: AlarmService = { ... };

// 내부 헬퍼 (export해서 테스트 가능하게)
export function calculateFinalTime(
  baseTime: string,            // "HH:mm"
  earlyMinutes: number,
  hasPrecip: boolean
): { time: string; crossesMidnight: boolean }
// crossesMidnight: true이면 전날 날짜로 처리 필요

export function findNextActiveDay(
  daysOfWeek: DayOfWeek[],
  startFrom: Date              // 탐색 시작 날짜 (이날 포함)
): Date | null
// 가장 가까운 활성 요일 반환. 없으면 null.

export function buildScheduledAt(
  date: Date,   // 알람 날짜
  time: string  // "HH:mm"
): string       // ISO 8601 절대 datetime
```

**알람 시각 계산 규칙 (ARCHITECTURE.md 기준)**:
- `hasPrecip` → finalTime = baseTime - earlyMinutes
- 결과가 자정 이전(음수 분)이면 crossesMidnight=true, 전날 날짜로 보정
- 예: 00:10 - 20분 → 전날 23:50

**재스케줄 분기 (ARCHITECTURE.md 요일 변경 시 재스케줄 분기)**:
- schedule() 호출 시 오늘이 활성 요일 AND 현재 시각 < finalTime → 오늘로 스케줄
- 오늘이 비활성 또는 이미 지났음 → tomorrow부터 findNextActiveDay

**복원 (restoreFromStorage)**:
- AsyncStorage에서 ScheduledAlarm 로드
- scheduledAt이 현재 시각 이후 → 재스케줄 (Notification ID 재생성)
- scheduledAt이 현재 시각 이전 → 다음 활성 요일로 재계산 후 재스케줄
- AlarmConfig 없음 → null 반환

**Notification 설정**:
```typescript
Notifications.setNotificationCategoryAsync('ALARM', []);
// 액션 없이 등록 → iOS 기본 스누즈 버튼 제거 (PRD §4)
```

알림 페이로드 (PRD §4 기준):
- title: "알람이 울었어요"
- body: `"${scheduledTime} • ${PTY_ICONS[precipType]} ${precipType !== 0 ? PTY_LABELS[precipType] : SKY_LABELS[sky]}"` 형식
- sound: 'default'
- badge: 1

**forecastSnapshot 저장**:
schedule() 반환 ScheduledAlarm의 forecastSnapshot은 반드시 입력 forecast 값이어야 한다.
null 허용 (API 실패 시). forecastSnapshot이 null이면 TTS에서 fallback 멘트 사용.

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=alarm
```

테스트 파일 `src/__tests__/services/alarm.test.ts` 작성 필수:
- calculateFinalTime: 강수 있음/없음, 자정 역행 케이스
- findNextActiveDay: 오늘 이후 첫 활성 요일, 없으면 null
- restoreFromStorage: 미래 알람 → 재스케줄, 지난 알람 → 다음 요일 재계산

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. calculateFinalTime("00:10", 20, true)의 crossesMidnight가 true인지 확인한다.
3. forecastSnapshot이 null이 아닌 케이스에서 ScheduledAlarm.forecastSnapshot === 입력 forecast인지 확인한다.
4. 결과에 따라 `phases/2-services/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/services/alarm.ts 구현. schedule/cancel/restoreFromStorage/getCurrent. calculateFinalTime(자정역행), findNextActiveDay, forecastSnapshot 저장. 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- `scheduledTime`("HH:mm")을 과거/미래 비교에 사용하지 마라. 이유: `scheduledAt`(ISO 8601)이 단일 진실소스. scheduledTime은 UI 표시 전용.
- `forecastSnapshot`을 null로 강제 설정하지 마라. 이유: TTS가 알람 해제 시 forecastSnapshot에서 멘트를 생성해야 한다. null이면 "날씨 정보 없음" fallback이 뜬다.
- 스누즈 액션을 Notification에 추가하지 마라. 이유: PRD §4 명시 — V1 스누즈 금지, `setNotificationCategoryAsync('ALARM', [])` 빈 액션 배열로 설정.
- expo-notifications를 직접 모킹하지 않은 테스트에서 실제 Notification 스케줄을 실행하지 마라. 이유: 시뮬레이터/CI에서 실패한다. jest.mock('expo-notifications')로 모킹.
