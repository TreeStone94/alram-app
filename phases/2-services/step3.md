# Step 3: location-permissions

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "권한 처리 플로우" 섹션 (_layout.tsx 마운트 시 실행 순서)
- `/docs/PRD.md` — §3 권한 플로우 (온보딩 Step 1, Step 2), GPS 실패 에러 처리
- `/CLAUDE.md`
- `src/types/alarm.ts`
- `src/lib/storage.ts` — LastLocation, ManualAddress 타입
- `src/lib/kma-grid.ts`

## 작업

GPS 위치 획득과 권한 관리 서비스를 구현한다.

### `src/services/location.ts`

```typescript
import * as Location from 'expo-location';
import type { LastLocation } from '@/lib/storage';

export interface LocationResult {
  lat: number;
  lon: number;
  nx: number;
  ny: number;
  source: 'gps' | 'stored' | 'manual';
}

// 현재 GPS 위치 획득
// - 10초 타임아웃 (ALARM_CONFIG.locationTimeoutMs)
// - 실패/타임아웃 시 AsyncStorage의 last_location 반환 (source: 'stored')
// - last_location도 없으면 null 반환
export async function getCurrentLocation(): Promise<LocationResult | null>

// GPS 위치를 AsyncStorage에 저장
export async function saveLocation(lat: number, lon: number): Promise<void>
// toKmaGrid로 nx, ny 계산 후 LastLocation으로 저장

// 저장된 마지막 위치 조회
export async function getStoredLocation(): Promise<LastLocation | null>
```

### `src/services/permissions.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PermissionState {
  notification: PermissionStatus;
  location: PermissionStatus;
}

// 현재 권한 상태 조회 (시스템 다이얼로그 표시 안 함)
export async function checkNotificationPermission(): Promise<PermissionStatus>
export async function checkLocationPermission(): Promise<PermissionStatus>

// 권한 요청 (시스템 다이얼로그 표시)
export async function requestNotificationPermission(): Promise<PermissionStatus>
export async function requestLocationPermission(): Promise<PermissionStatus>
// 'whenInUse' 권한 요청 (항상 허용은 요청하지 않음 — PRD §3)

// iOS 설정 앱 딥링크 열기
// UIApplication.openSettingsURLString 활용
export async function openAppSettings(): Promise<void>
```

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern="location|permissions"
```

테스트 파일 `src/__tests__/services/location.test.ts`:
- expo-location 모킹
- GPS 성공 → LocationResult (source: 'gps') 반환
- GPS 실패 → stored location 반환 (source: 'stored')
- stored도 없음 → null 반환

테스트 파일 `src/__tests__/services/permissions.test.ts`:
- expo-notifications 모킹 후 checkNotificationPermission 반환값 확인

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. GPS 타임아웃이 `ALARM_CONFIG.locationTimeoutMs`(10000ms) 상수를 사용하는지 확인한다.
3. 결과에 따라 `phases/2-services/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/services/location.ts (GPS/fallback/저장), src/services/permissions.ts (체크/요청/설정앱딥링크). 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- '항상 허용(always)' 위치 권한을 요청하지 마라. 이유: PRD §3 — "앱 사용 중(whenInUse)" 권한만 요청.
- GPS 실패 시 에러를 throw하지 마라. 이유: 저장된 위치 → 수동 입력 순서로 graceful fallback해야 한다 (CLAUDE.md 에러 처리 기준).
- 권한 요청을 알람 설정 시도 시점에 하지 마라. 이유: ARCHITECTURE.md 권한 처리 플로우에 따라 onboarding에서 처리 (PRD §3, ARCHITECTURE.md 주석 5번 참조).
