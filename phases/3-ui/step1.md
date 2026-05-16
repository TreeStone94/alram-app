# Step 1: onboarding

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` — §3 권한 플로우 (Step 1~3 상세, [나중에] 버튼 동작, 수동 주소 picker)
- `/docs/UI_GUIDE.md` — 색상, 타이포그래피, 버튼 스타일
- `/CLAUDE.md`
- `src/services/permissions.ts`
- `src/lib/kma-address.ts` — 수동 주소 picker 데이터
- `src/lib/storage.ts` — ManualAddress 저장
- `src/hooks/usePermissions.ts`

## 작업

온보딩 화면 4개를 구현한다. 사용자가 최초 실행 시 순서대로 거치는 흐름이다.

### `src/app/onboarding/_layout.tsx`

온보딩 전용 Stack 레이아웃. 뒤로가기 제스처 비활성화.

### `src/app/onboarding/notification.tsx` (Step 1: 알림 권한)

UI 요소:
- 앱 아이콘/일러스트
- 제목: "매일 아침, 날씨 알람을 울려드릴게요"
- 설명: 알람 앱 특성 안내
- [허용하기] 버튼 → `requestNotificationPermission()` → 허용 시 location.tsx로 이동
- [나중에] 버튼 → 메인 화면으로 이동 (알람 기능 비활성 상태)
  - 거부/나중에 선택 시: 메인 화면 상단에 고정 배너 표시 (배너는 _layout에서 처리)

### `src/app/onboarding/location.tsx` (Step 2: 위치 권한 + 수동 picker)

UI 요소:
- 제목: "현재 위치로 날씨를 확인해요"
- [위치 허용하기] 버튼 → `requestLocationPermission()` → 허용 시 silent-mode.tsx로 이동
- [직접 주소 입력하기] 버튼 → 인라인 picker 표시 (같은 화면 내)

**수동 주소 picker** (PRD §3 Step 2):
```
시/도 선택 (Picker/Select) → 시/군/구 선택 (Picker/Select)
선택 완료 → storage.manualAddress.set({ sido, sigungu, nx, ny })
           → "날씨 정보를 [주소]로 설정했어요" 토스트
           → silent-mode.tsx로 이동
```
- `getSidoList()`, `getSigunguList(sido)`, `findRegion(sido, sigungu)` 사용
- [나중에] 선택지 없음 — 반드시 위치 허용 또는 수동 입력 후 진행 (PRD §3)

### `src/app/onboarding/silent-mode.tsx` (Step 3: 무음 안내)

권한 요청이 아닌 안내 화면:
- "알람 앱이라 소리가 필요해요. 무음 모드 해제를 권장해요"
- DND 안내: "방해금지 모드를 자주 사용하신다면, [설정 > 집중 모드 > 허용된 앱]에서 이 앱을 추가해주세요."
- [설정 열기] 버튼 (선택사항) → `openAppSettings()` 호출
- [알겠어요, 시작하기] 버튼 → 메인 화면(index)으로 이동
- 타임존 안내: "알람 시간은 기기 시간을 따릅니다"

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=onboarding
```

테스트 파일 `src/__tests__/app/onboarding/location.test.tsx`:
- getSidoList, getSigunguList, findRegion 모킹
- 시/도 선택 → 시/군/구 목록 갱신 확인
- 수동 주소 완료 → ManualAddress 저장 확인

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. location.tsx에서 [나중에] 버튼이 없는지 확인한다 (PRD §3 — 반드시 둘 중 하나 선택).
3. 결과에 따라 `phases/3-ui/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "온보딩 4화면 구현 (notification/location+picker/silent-mode). 수동 주소 picker(2단계 드롭다운), ManualAddress 저장. 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- location.tsx에 [나중에] 버튼을 추가하지 마라. 이유: PRD §3 — 위치 설정은 반드시 완료해야 알람이 동작함.
- 수동 picker에서 findRegion 결과가 null일 때 저장하지 마라. 이유: nx, ny 없이 날씨 API를 호출할 수 없다. 선택 불완료 상태로 진행 금지.
- 온보딩 완료 여부를 별도 flag로 저장하지 마라. 이유: _layout.tsx가 권한 상태로 이미 온보딩 여부를 판단한다.
