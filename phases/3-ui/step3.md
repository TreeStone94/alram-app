# Step 3: main-screen

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` — §1 알람 설정, §5 다음 알람 표시, §7 에러 상태 UX 표준
- `/docs/UI_GUIDE.md` — 메인 화면 레이아웃, 빈 상태 디자인
- `/docs/ARCHITECTURE.md` — "데이터 플로우 - 알람 설정 → 스케줄 저장"
- `/CLAUDE.md`
- `src/hooks/useAlarm.ts`, `src/hooks/useWeather.ts`, `src/hooks/usePermissions.ts`
- `src/components/` — 이전 step에서 생성된 모든 컴포넌트
- `src/app/index.tsx` — Phase 0에서 생성된 placeholder (교체 대상)

## 작업

메인 화면(`src/app/index.tsx`)을 완전히 구현한다.

### `src/app/index.tsx`

**레이아웃 구조**:
1. 상단: 권한 거부 배너 (notification 'denied'일 때만 표시, persistent=true)
2. 중앙: AlarmTimePicker + 조정 시간(earlyMinutes) 설정
3. 중앙: DayOfWeekToggle (요일별 토글)
4. 중앙: WeatherBadge (날씨로 인한 조정 여부)
5. 하단: "다음 [요일] [HH:MM]" 표시 (nextAlarmLabel)
6. 하단: 이번 주 미리보기 (CEO plan accepted, 활성 요일별 예정 시간 + 날씨 아이콘)

**주요 동작**:

*설정 변경 → 디바운스 → 저장*:
- AlarmTimePicker 변경 → 1.5s 디바운스 (useAlarm 내부 처리)
- 디바운싱 중: 하단 서브텍스트에 "날씨 확인 중..." 표시 (isDebouncing=true)
- 저장 완료: "✓ [HH:MM] 알람이 설정되었어요" 2초 Toast (빈 상태 → 첫 설정 시)

*알람 복원 배너*:
- restoreAlarm() 성공 시 상단에 5초 배너 "✓ 알람 복구됨. [HH:MM]에 울어요"

*날씨 API 실패*:
- 배너 "날씨를 확인할 수 없어요. 기본 시간으로 설정됐어요" + [재시도] 버튼

*빈 상태 (알람 설정 안 됨)*:
- "알람을 설정해보세요" 안내 + AlarmTimePicker (상호작용 가능)

*자정 역행 경고*:
- earlyMinutes 적용 시 자정 이전으로 당겨지는 경우 → 다이얼로그
- "[기본 시간으로 설정] [전날 [시각]으로 설정]" 선택 (PRD §1 엣지케이스)

*권한 거부 상태*:
- 알람 컨트롤 opacity 0.5 + 탭 시 툴팁 "알림 권한을 먼저 허용해주세요"
- 상단 고정 배너 [설정 열기] 버튼

```typescript
export default function HomeScreen() { ... }
```

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern="app/index|main-screen"
```

테스트 파일 `src/__tests__/app/index.test.tsx`:
- AlarmState 'idle' → 빈 상태 UI 렌더링 확인
- AlarmState 'scheduled' → 다음 알람 표시 확인
- 권한 거부 시 알람 컨트롤 disabled 확인

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. isDebouncing=true일 때 "날씨 확인 중..." 텍스트가 표시되는지 확인한다.
3. 결과에 따라 `phases/3-ui/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/app/index.tsx 구현. 디바운싱 상태 표시, 복원 배너, 자정 역행 다이얼로그, 빈 상태, 권한 배너, 이번 주 미리보기. 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- API 호출을 디바운스 없이 AlarmTimePicker onChange마다 직접 실행하지 마라. 이유: 빠른 시간 변경 시 과도한 API 호출 발생.
- 알람 컨트롤을 권한 거부 시에도 완전히 숨기지 마라. 이유: PRD §3 — opacity 0.5로 비활성화하고 탭 시 툴팁 표시. 숨기면 사용자가 기능 자체를 모른다.
- 자정 역행 케이스에서 사용자 확인 없이 자동으로 전날 시각으로 설정하지 마라. 이유: PRD §1 엣지케이스 — 반드시 명시적 선택 필요.
