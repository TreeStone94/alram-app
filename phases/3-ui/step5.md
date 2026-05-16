# Step 5: settings-background

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "BackgroundFetch (야간 예보 갱신)", "tasks/weather-refresh.ts"
- `/docs/PRD.md` — §1 BackgroundFetch 미실행/실패 케이스, 이번 주 미리보기
- `/docs/ADR.md` — ADR-010 (BackgroundFetch는 보조 수단)
- `/CLAUDE.md`
- `src/services/alarm.ts`, `src/services/weather.ts`
- `src/lib/storage.ts`, `src/lib/kma-address.ts`
- `src/hooks/useAlarm.ts`, `src/hooks/useWeather.ts`

## 작업

설정 화면과 BackgroundFetch 태스크를 구현한다. 이 step으로 V1 구현이 완성된다.

### `src/app/settings.tsx`

**섹션 구성**:
1. **알람 설정 요약**: 현재 earlyMinutes, 기준 알람 시각 표시
2. **위치 설정**: 현재 위치 표시 (GPS 또는 수동 주소)
   - [위치 자동 감지] 또는 [수동 변경] 탭 → 위치 변경 → API 재호출 → 알람 재스케줄
   - 변경 완료: "위치가 변경됐어요. [도시명] 날씨로 다시 설정했습니다" Toast
3. **날씨 갱신**: [지금 갱신] 버튼
   - 탭 → 로딩 스피너 → 성공: "날씨 정보를 업데이트했어요" Toast
   - 실패: ErrorBanner "날씨 갱신 실패"
4. **이번 주 알람 미리보기** (CEO plan accepted): 활성 요일별 예정 알람 시각 + 날씨 아이콘 목록
   - 예: 월 06:20 🌧 / 화 06:40 ☀️ / ... (3-5일)
5. **방해금지 모드 안내**: [집중 모드 설정 열기] 버튼 → openAppSettings()
6. **V2 예정 기능** (비활성 행): "잠금화면 위젯", "Siri 단축어" 탭 시 툴팁 "V2에서 지원 예정"
7. **개발자 모드** (베타 전용): 에러 로그 조회, schemaVersion 표시

```typescript
export default function SettingsScreen() { ... }
```

### `src/tasks/weather-refresh.ts`

BackgroundFetch 태스크. iOS OS가 간헐적으로 실행하는 야간 예보 갱신.

```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

export const WEATHER_REFRESH_TASK = 'WEATHER_REFRESH_TASK';

// TaskManager.defineTask으로 태스크 정의
TaskManager.defineTask(WEATHER_REFRESH_TASK, async () => {
  // 1. AsyncStorage에서 ScheduledAlarm 로드
  //    없으면 BackgroundFetch.BackgroundFetchResult.NoData 반환
  // 2. weatherService.getForecastByGrid(nx, ny) (캐시 무시, 강제 갱신)
  //    실패하면 BackgroundFetch.BackgroundFetchResult.Failed 반환
  //    기존 스케줄 유지 (변경하지 않음)
  // 3. 기존 precipType vs 새 precipType 비교
  //    동일 → BackgroundFetch.BackgroundFetchResult.NewData (변경 없음)
  //    다름 →
  //      기존 Notification 취소
  //      새 시각 계산 (alarmService.schedule)
  //      ScheduledAlarm.forecastSnapshot = 새 WeatherForecast로 업데이트
  //      AsyncStorage 업데이트
  //      BackgroundFetch.BackgroundFetchResult.NewData 반환
});

// 앱 시작 시 등록 (_layout.tsx 또는 여기서 export해서 _layout에서 호출)
export async function registerWeatherRefreshTask(): Promise<void>
// BackgroundFetch.registerTaskAsync(WEATHER_REFRESH_TASK, {
//   minimumInterval: 60 * 60,  // 최소 1시간 간격 (iOS OS가 실제 실행 시각 결정)
//   stopOnTerminate: false,
//   startOnBoot: false,  // iOS에서 재부팅 후 자동 실행 없음 (ADR-006 제약)
// })
```

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern="settings|weather-refresh"
```

테스트 파일 `src/__tests__/tasks/weather-refresh.test.ts`:
- ScheduledAlarm 없음 → NoData 반환
- API 실패 → Failed 반환, 기존 스케줄 미변경 확인
- precipType 변경됨 → 기존 취소 + 새 스케줄 + forecastSnapshot 업데이트 확인

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. weather-refresh.ts에서 API 실패 시 기존 알람 취소하지 않는지 확인한다 (신뢰성 원칙).
3. forecastSnapshot이 새 WeatherForecast로 업데이트되는지 테스트로 확인한다.
4. 결과에 따라 `phases/3-ui/index.json`의 step 5를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/app/settings.tsx (위치변경/날씨갱신/이번주미리보기/DND안내/V2비활성행), src/tasks/weather-refresh.ts (BackgroundFetch, precipType 변경 시 재스케줄+forecastSnapshot 업데이트). 테스트 통과. V1 구현 완료."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- BackgroundFetch 실패 시 기존 알람을 취소하지 마라. 이유: ADR-010 — BackgroundFetch는 보조 수단이며 실패해도 기존 스케줄이 유지돼야 한다. 알람 신뢰성 > 날씨 최신성.
- `startOnBoot: true`로 설정하지 마라. 이유: iOS는 재부팅 후 앱 자동 실행을 지원하지 않는다 (ARCHITECTURE.md iOS 제약 사항).
- BackgroundFetch 태스크 내에서 TTS를 실행하지 마라. 이유: iOS는 Background Audio 없음 (ARCHITECTURE.md iOS 제약 — foreground에서만 TTS 가능).
- forecastSnapshot을 업데이트하지 않고 스케줄만 변경하지 마라. 이유: TTS 멘트가 스케줄 당시 예보 기반이어야 하므로 스케줄과 forecastSnapshot은 항상 함께 업데이트 (ARCHITECTURE.md BackgroundFetch 플로우).
