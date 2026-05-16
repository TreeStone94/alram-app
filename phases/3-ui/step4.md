# Step 4: alarm-ring-screen

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "데이터 플로우 - 알람 울림 → TTS 재생 → 해제"
- `/docs/PRD.md` — §2 TTS 엣지케이스 전체 (60초 타임아웃, 자막 폴백, 재청취 옵션)
- `/CLAUDE.md`
- `src/services/tts.ts` — speakWeatherBrief
- `src/lib/weather-template.ts` — generateScript
- `src/hooks/useAlarm.ts` — dismissAlarm
- `src/components/SlideToDisarm.tsx`, `src/components/WeatherCard.tsx`
- `src/lib/storage.ts`
- `src/constants/config.ts` — TTS_CONFIG

## 작업

알람 울림 화면(`src/app/alarm-ring.tsx`)을 구현한다.
알람 Notification 탭 후 진입하는 화면이며, TTS 재생과 알람 해제를 담당한다.

### `src/app/alarm-ring.tsx`

**마운트 시 실행 순서**:
1. AsyncStorage에서 ScheduledAlarm 로드 (`storage.scheduledAlarm.get()`)
2. `ScheduledAlarm.forecastSnapshot` 사용 (실시간 재조회 금지 — ARCHITECTURE.md 명시)
3. `generateScript(forecastSnapshot)` → script 생성
4. 500ms 딜레이 후 TTS 시작 (`speakWeatherBrief(forecastSnapshot)`)
5. 60초 타임아웃 타이머 시작

**UI 구성**:
- 상단: 알람 시각 표시 (`scheduledTime`)
- 중앙: WeatherCard (forecastSnapshot 표시)
- 중앙: TTS 스크립트 자막 텍스트 (script, 작은 폰트)
  - TTS 실패 시에도 자막은 항상 표시 (PRD §2 — "날씨 스크립트 텍스트를 화면에 자막으로 표시")
- 하단: SlideToDisarm
- 조건부: [건너뛰기] 버튼 (60초 후 노출)
- 조건부: [다시 듣기] 버튼 (CEO plan accepted — TTS 조기 해제 시 팝업)

**TTS 흐름**:
```
TTS 시작 → 재생 중
  → 사용자 SlideToDisarm 완료:
      → TTS stop()
      → dismissAlarm() 호출
      → TTS 완료 전 해제 → [다시 듣기] 팝업 표시
        → [다시 듣기] 탭: speakWeatherBrief(forecastSnapshot) 재실행
        → [그냥 닫기] 탭: index.tsx로 이동
  → TTS 완료 (onDone):
      → SlideToDisarm만 표시 (TTS 버튼 제거)
  → 60초 타임아웃:
      → [건너뛰기] 버튼 노출
      → [건너뛰기] 탭 → TTS stop() → SlideToDisarm 유지
```

**앱 백그라운드 진입 시**:
- TTS 재생 중단 (AppState 변화 감지)
- 다시 foreground 시 재생 시도하지 않음 (이미 해제 의도로 간주 — PRD §2)

**SlideToDisarm 완료 후 해제 흐름**:
```typescript
const handleDisarm = async () => {
  // 1. TTS stop
  // 2. dismissAlarm() → 다음 활성 요일 재스케줄
  // 3. TTS가 완료되기 전이었으면 → [다시 듣기] 팝업 모달 표시
  // 4. [그냥 닫기] → router.replace('/') (메인 화면)
};
```

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=alarm-ring
```

테스트 파일 `src/__tests__/app/alarm-ring.test.tsx`:
- 마운트 시 storage.scheduledAlarm.get() 호출 확인
- 500ms 후 speakWeatherBrief 호출 확인 (jest.useFakeTimers)
- 60초 후 [건너뛰기] 버튼 노출 확인
- forecastSnapshot=null → fallback 멘트 사용 확인

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. forecastSnapshot이 null일 때 "날씨 정보를 가져오지 못했어요" 자막이 표시되는지 확인한다.
3. 결과에 따라 `phases/3-ui/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/app/alarm-ring.tsx 구현. forecastSnapshot TTS, 자막 폴백, 60초 건너뛰기, 다시듣기 팝업, SlideToDisarm 해제 흐름. 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- 알람 해제 화면에서 날씨 API를 실시간 재호출하지 마라. 이유: `forecastSnapshot`을 사용해야 한다. 재조회하면 알람 스케줄 당시 예보와 해제 시 예보가 달라져 "비 때문에 일찍 깼는데 현재 맑음" 불일치 발생 (ARCHITECTURE.md 명시).
- 알람 해제 화면에서 ErrorBanner를 표시하지 마라. 이유: CLAUDE.md — "알람 해제 화면에서는 에러 배너 금지". 에러는 무음/자막으로만 처리.
- TTS 재생 실패 시 화면을 닫거나 에러를 throw하지 마라. 이유: 알람 해제 UX가 최우선. TTS 실패는 무음 처리 후 자막으로 대체.
- foreground에서 백그라운드로 나간 후 복귀 시 TTS를 자동 재시작하지 마라. 이유: PRD §2 — "다시 foreground 시 재생 시도하지 않음 (이미 해제 의도로 간주)".
