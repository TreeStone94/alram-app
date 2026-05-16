# 프로젝트: 날씨 연동 스마트 알람 앱 (Cloak Alarm)

## 기술 스택
- React Native + Expo SDK (TypeScript strict mode)
- Expo Router (파일 기반 라우팅)
- iOS 먼저, Android 순차 추가 (V2)
- `expo-notifications` — Local Notification 알람 스케줄
- `expo-task-manager` + `expo-background-fetch` — 야간 날씨 재확인
- `expo-location` — GPS 위치 획득
- `@react-native-async-storage/async-storage` — 알람 설정 + 날씨 캐시 영속
- 기상청 단기예보 API (공공데이터포털, 무료, `KMA_API_KEY` 환경변수)
- iOS `AVSpeechSynthesizer` (V1 TTS) → Supertonic ONNX (V2 TTS)

## 아키텍처 규칙

### CRITICAL
- 알람은 반드시 앱 내에서 설정 (iOS 네이티브 알람 수정 API 없음)
- TTS는 알람 해제 후 foreground에서만 실행. 클라우드 LLM 호출 절대 금지 (오프라인 동작 필수)
- 날씨 API 실패 시 반드시 기본 알람 시간으로 폴백 — 알람 신뢰성 > 날씨 정확성
- API 키(`KMA_API_KEY`)를 코드에 하드코딩하거나 AsyncStorage에 저장 금지. `app.config.js` extra + EAS 환경변수만 사용
- 모든 에러 상태에 대응하는 UI가 있어야 함 (로딩/에러/빈 상태 누락 금지)

### 설계 원칙
- BackgroundFetch는 보조 수단. 주 알람 스케줄은 사용자 알람 설정 시점에 즉시 처리
- 날씨 멘트는 온디바이스 템플릿 방식 (`src/lib/weather-template.ts`)
- TTS 실패는 무음 처리 — 알람 해제 UX 방해 금지
- 에러 로그는 AsyncStorage에 최대 50건 로컬 저장 (외부 전송 없음)

### 파일 구조 규칙
- 컴포넌트: `src/components/`
- 서비스 (외부 API, 알람, TTS): `src/services/`
- 순수 유틸/로직: `src/lib/`
- BackgroundFetch 태스크: `src/tasks/`
- React 훅: `src/hooks/`
- 타입: `src/types/`
- 상수: `src/constants/`

## MVP V1 범위
- 하루 1개 알람, 요일별 활성/비활성 (월~일 토글)
- 눈/비 예보(PTY=1,2,3,4) 시 사용자 설정 분(기본 20분) 일찍 알람
- 알람 해제 후 TTS로 날씨+옷차림 안내 (친구형 스타일 1가지)
- GPS 위치 기반 기상청 API → 권한 거부 시 수동 주소 입력 fallback
- 앱 실행 시 저장된 AlarmConfig로 알람 자동 복원 (재부팅 대응)

## MVP V1 제외 (V2에서)
- 복수 알람
- TTS 스타일 4가지 선택 (유머/응원/친구/재치)
- Supertonic 온디바이스 TTS 교체
- 황사/미세먼지 경보
- Android 지원
- 스누즈 기능
- 상품 광고 연동 (Phase 2, 사용자 100명 이후)

## 에러 처리 기준
| 에러 | 처리 |
|------|------|
| 날씨 API 실패 | 3회 재시도 (1s/2s/4s) → 캐시 → 기본 알람 |
| GPS 실패 | 마지막 저장 위치 → 수동 주소 입력 |
| Notification 스케줄 실패 | 권한 확인 → 재시도 → Toast 에러 |
| TTS 실패 | 무음 처리 (에러 표시 없음) |
| 파싱 오류 | 로컬 에러 로그 + 기본 알람 |

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식 (feat:, fix:, docs:, refactor:, test:)
- iOS 알람 → TTS 플로우는 구현 전 POC 필수 (실기기 테스트 — 시뮬레이터로 검증 불가)
- 모든 서비스는 인터페이스 먼저 정의, 구현 교체 가능하게 (ADR-004 TTS V1→V2 참조)

## Codex 작업 가드레일
- 작업 종료 전 `node_modules`가 설치되어 있으면 `npm run lint`, `npm run typecheck`, `npm run test`를 실행해 검증할 것.
- 다음 명령은 사용자 명시 승인 없이 실행 금지: `rm -rf`, `git push --force`, `git reset --hard`, `DROP TABLE`.
- 위 규칙은 `.claude/settings.json`의 Stop/PreToolUse hook 의도를 Codex가 읽을 수 있도록 옮긴 것이다. Codex는 Claude hook을 직접 실행하지 않으므로 이 섹션을 우선 지침으로 따른다.

## 명령어
```bash
npx expo start           # 개발 서버 (Expo Go)
npx expo run:ios         # iOS 시뮬레이터 (native build)
eas build --platform ios --profile development  # 실기기 dev build
eas build --platform ios --profile production   # TestFlight 빌드
npm run test             # Jest 단위 테스트
npm run test:watch       # 테스트 watch 모드
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
```

## 참조 문서
- `docs/PRD.md` — 기능 요구사항, 에러 케이스, API 스펙
- `docs/ARCHITECTURE.md` — 타입 정의, 서비스 스펙, 데이터 플로우, 테스트 전략
- `docs/ADR.md` — 기술 선택 근거 (TTS, API, 라우팅, 상태관리 등)
- `docs/UI_GUIDE.md` — 색상, 컴포넌트, 레이아웃, 접근성
