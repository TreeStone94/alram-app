# Step 0: layout-routing

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "권한 처리 플로우" 섹션 (_layout.tsx 마운트 시 실행 순서 0~7번), "데이터 플로우 - 알람 울림 → TTS" cold start 라우팅, foreground 라우팅
- `/docs/PRD.md` — §1 알람 울리는 시간 케이스 (foreground/background/killed), §3 권한 플로우
- `/CLAUDE.md`
- `src/hooks/useAlarm.ts`, `src/hooks/usePermissions.ts`
- `src/services/permissions.ts`
- `src/app/_layout.tsx` — Phase 0에서 생성된 placeholder (교체 대상)

## 작업

`src/app/_layout.tsx`를 완전히 교체한다. 이 파일이 앱의 진입점이며 Notification 라우팅과 권한 초기화를 담당한다.

### `src/app/_layout.tsx`

**반드시 아래 순서로 초기화를 수행한다** (ARCHITECTURE.md 권한 처리 플로우 0~7번):

```typescript
// 마운트 시 실행 순서 (순서 변경 금지):
// 0. [최우선] getLastNotificationResponseAsync() — cold start 알람 탭 감지
//    응답 있으면 router.replace('/alarm-ring') 즉시 실행 후 이후 초기화 중단
//    getLastNotificationResponseAsync는 앱 실행 후 짧은 시간만 유효 → await 즉시 호출 필수
//    이 단계는 절대 다른 작업과 Promise.all로 병렬 처리하지 않는다.
//
// 1. addNotificationReceivedListener() 등록
//    콜백: notification.request.content.categoryIdentifier === 'ALARM' → router.replace('/alarm-ring')
//    foreground에서 수신된 notification은 자동 표시 안 됨 → 직접 화면 전환
//    unmount 시 구독 해제 (메모리 누수 방지)
//
// 2. Promise.all([checkNotificationPermission(), checkLocationPermission()])
//
// 3. notification 'undetermined' → router.replace('/onboarding/notification')
//
// 4. notification 'denied' → 메인 화면, 상단 고정 배너 활성화
//    앱 포그라운드 복귀 시마다 권한 재확인 (AppState.addEventListener 사용)
//
// 5. location 'undetermined' → router.replace('/onboarding/location')
//    (notification이 이미 처리된 경우에만)
//
// 6. location 'denied' → 수동 주소 입력 모드 (onboarding에서 처리)
//
// 7. restoreAlarm() — 재부팅/업데이트 후 알람 복원
```

**알림 전역 설정**:
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,  // foreground에서 alert 표시 안 함 (직접 화면 전환)
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});
```

**라우팅**:
- `expo-router`의 `Stack` 사용
- 화면: index(메인), alarm-ring, settings, onboarding/* 포함
- `screenOptions={{ headerShown: false }}` 전체 적용

**권한 상태 컨텍스트**:
- usePermissions() 훅으로 권한 상태 관리
- 배너 표시 여부(notificationDenied)를 Context 또는 prop으로 하위 화면에 전달

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=layout
```

테스트 파일 `src/__tests__/app/layout.test.tsx`:
- `getLastNotificationResponseAsync`가 첫 번째로 호출되는지 확인 (다른 초기화보다 먼저)
- cold start response 있을 때 `router.replace('/alarm-ring')` 호출 확인
- ALARM category notification 수신 시 `router.replace('/alarm-ring')` 호출 확인

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 초기화 순서에서 `getLastNotificationResponseAsync`가 0번에 위치하고 await이 적용됐는지 확인한다.
3. 결과에 따라 `phases/3-ui/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/app/_layout.tsx 구현. cold-start 알람 탭 감지(0번 최우선), foreground listener, 권한 초기화 순서, restoreAlarm. 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- `getLastNotificationResponseAsync()`를 다른 초기화 작업과 Promise.all로 병렬 실행하지 마라. 이유: 응답 유효 시간이 짧아서 다른 작업에 밀리면 이미 무효화될 수 있다 (ARCHITECTURE.md 성능 주의 참조).
- foreground 알림 수신 리스너를 unmount 시 해제하지 않으면 안 된다. 이유: 메모리 누수 발생 (ARCHITECTURE.md 주석 참조).
- `shouldShowAlert: true`로 설정하지 마라. 이유: foreground에서는 배너 대신 직접 alarm-ring으로 화면 전환해야 한다.
