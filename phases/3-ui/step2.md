# Step 2: components

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/UI_GUIDE.md` — 색상, 타이포그래피, 컴포넌트 스타일, 접근성 가이드
- `/docs/PRD.md` — §2 TTS 엣지케이스 (SlideToDisarm 동작), §3 권한 플로우 (배너)
- `/CLAUDE.md`
- `src/types/alarm.ts`, `src/types/weather.ts`
- `src/constants/weather-codes.ts`

## 작업

앱 전반에서 사용하는 공유 컴포넌트 7개를 구현한다.

### `src/components/SlideToDisarm.tsx`

알람 해제 슬라이더.

```typescript
interface SlideToDisarmProps {
  onDisarm: () => void;       // 슬라이드 완료 시 호출
  disabled?: boolean;
}
```

- PanResponder 또는 react-native-gesture-handler로 구현
- 좌→우 스와이프 완료(80% 이상) → onDisarm 호출
- 50% 미만에서 손 뗌 → 원위치 스냅백 애니메이션 (Animated.spring)
- VoiceOver 접근성: `accessible={true}`, `accessibilityLabel="알람 해제"`, `accessibilityRole="adjustable"`
- VoiceOver 대체 액션: `accessibilityActions={[{ name: 'activate', label: '알람 해제' }]}`
  - `onAccessibilityAction` → action.nativeEvent.actionName === 'activate' 시 onDisarm 호출
  - (두 손가락 더블탭의 VoiceOver 대체)

### `src/components/DayOfWeekToggle.tsx`

요일별 토글 (월~일).

```typescript
interface DayOfWeekToggleProps {
  value: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  disabled?: boolean;
}
```

- 7개 버튼: 월/화/수/목/금/토/일
- 활성 요일: 배경색 강조, 비활성: 기본 배경
- 접근성: 각 버튼에 `accessibilityLabel="[요일] [활성/비활성]"`, `accessibilityRole="button"`

### `src/components/WeatherCard.tsx`

날씨 요약 카드 (알람 해제 화면에 표시).

```typescript
interface WeatherCardProps {
  forecast: WeatherForecast | null;
  script?: string;   // TTS 스크립트 텍스트 (자막 표시용)
}
```

- forecast null → "날씨 정보를 가져오지 못했어요" 빈 상태 표시
- 온도, 하늘상태 아이콘, 강수형태 아이콘 표시
- script prop 있으면 자막으로 표시 (TTS 실패 폴백, PRD §2)

### `src/components/WeatherBadge.tsx`

날씨 상태 배지 (메인 화면의 콤팩트 표시).

```typescript
interface WeatherBadgeProps {
  forecast: WeatherForecast | null;
  weatherAdjusted: boolean;   // 날씨로 인해 알람 시각 조정됐는지
}
```

- precipType != 0이고 weatherAdjusted=true → `"🌧 20분 일찍! [finalTime] (원래 [baseTime])"` 형식
- 날씨 아이콘 + 온도 표시
- forecast null → 빈 상태

### `src/components/Toast.tsx`

하단 Toast 메시지 (3초 자동 소멸).

```typescript
interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  action?: { label: string; onPress: () => void };
}
```

- 하단에서 slide-up 애니메이션
- 3초 후 자동 소멸 (onHide 호출)
- action 있으면 [버튼] 표시

### `src/components/ErrorBanner.tsx`

상단 에러 배너.

```typescript
interface ErrorBannerProps {
  message: string;
  visible: boolean;
  persistent?: boolean;    // true이면 수동으로만 닫힘 (false이면 3초 후 자동 소멸)
  onClose?: () => void;
  action?: { label: string; onPress: () => void };
}
```

- persistent=true: 닫기 불가, 매 세션 노출 (권한 거부 배너용)
- persistent=false: 3초 후 자동 소멸
- 빨간 배경 (에러), 노란 배경 (경고) — UI_GUIDE.md 색상 참조

### `src/components/LoadingOverlay.tsx`

전체 화면 로딩.

```typescript
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}
```

### `src/components/AlarmTimePicker.tsx`

시간 선택 컴포넌트.

```typescript
interface AlarmTimePickerProps {
  value: string;    // "HH:mm"
  onChange: (time: string) => void;
  disabled?: boolean;
}
```

- 시/분 wheel picker (ScrollView 또는 @react-native-community/datetimepicker)
- 접근성: `accessibilityLabel="시간 선택"`

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=components
```

테스트 파일 `src/__tests__/components/SlideToDisarm.test.tsx`:
- 슬라이드 80% 이상 → onDisarm 호출 확인
- VoiceOver accessibilityAction 'activate' → onDisarm 호출 확인

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. SlideToDisarm에 VoiceOver 대체 액션(`onAccessibilityAction`)이 구현됐는지 확인한다.
3. 결과에 따라 `phases/3-ui/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/components/ 8개 구현 (SlideToDisarm/DayOfWeekToggle/WeatherCard/WeatherBadge/Toast/ErrorBanner/LoadingOverlay/AlarmTimePicker). VoiceOver 대체 액션 포함. 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- SlideToDisarm을 단순 버튼으로 대체하지 마라. 이유: 슬라이드 제스처가 알람 해제 UX의 핵심이며 실수로 닫히는 것을 방지한다.
- VoiceOver accessibilityActions 없이 SlideToDisarm을 구현하지 마라. 이유: UI_GUIDE.md 접근성 가이드 — VoiceOver 사용자를 위한 대체 액션 필수.
- ErrorBanner에서 persistent=true일 때 자동 소멸 타이머를 설정하지 마라. 이유: 권한 배너는 사용자가 권한을 허용할 때까지 유지돼야 한다 (PRD §3).
