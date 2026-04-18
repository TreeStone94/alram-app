# Architecture Decision Records

## 철학
알람 신뢰성 최우선. 복잡한 기능보다 "매일 아침 정확히 울리는" 기본에 집중.
외부 클라우드 의존성 최소화 (TTS 무료, 날씨 API 무료).
오프라인에서도 알람 해제 + TTS 동작해야 함.

---

### ADR-001: React Native + Expo 선택 (Flutter 대신)

**결정**: React Native + Expo SDK (managed workflow)

**이유**:
- `expo-notifications`, `expo-background-fetch`, `expo-location`, `expo-task-manager` — 알람 앱에 필요한 모든 네이티브 기능이 Expo 생태계에 존재
- EAS Build로 TestFlight/App Store 배포 자동화
- TypeScript + React 기반 — 기존 웹 개발 경험 재사용
- 한국 개발자 커뮤니티 레퍼런스 코드가 RN에 더 많음

**트레이드오프**:
- Expo managed workflow는 일부 네이티브 모듈 사용 불가 → 필요 시 `expo-modules-core`로 직접 작성하거나 bare workflow 전환
- Flutter는 Supertonic Flutter SDK를 직접 지원하나, V1에서 Supertonic 미사용 → 영향 없음
- Expo Go로 개발 중 expo-notifications 일부 기능 제한 → 실기기 + dev build 필수

**재검토 조건**: Supertonic V2 통합 시 Flutter SDK가 유일한 옵션이면 재검토

---

### ADR-002: Expo Router 사용 (React Navigation 대신)

**결정**: Expo Router (파일 기반 라우팅)

**이유**:
- Expo SDK 49+에서 공식 권장
- 파일 구조 = 라우팅 구조 → 코드베이스 파악 쉬움
- Deep link 처리가 자동 (알람 Notification 탭 → 특정 화면 진입 시 필요)
- 추후 웹 지원 시 동일 코드 재사용 가능

**트레이드오프**:
- React Navigation 대비 커뮤니티 레퍼런스 적음
- 복잡한 중첩 네비게이션에서 일부 제약 → MVP에서는 화면 3개뿐이므로 무관

---

### ADR-003: AsyncStorage (데이터 영속)

**결정**: `@react-native-async-storage/async-storage` 사용. SecureStore 미사용.

**이유**:
- 저장 데이터(알람 시간, 날씨 캐시, 위치)는 암호화 불필요 — 개인정보 아님
- SecureStore는 생체인증/Keychain 연동 — 오버엔지니어링
- AsyncStorage는 Expo 공식 지원, 간단한 key-value 저장에 최적

**트레이드오프**:
- 암호화 없음 — API 키는 AsyncStorage 저장 금지 (환경변수로만 관리)
- 대용량 데이터 부적합 → 날씨 캐시는 최신 1회 응답만 저장 (소용량 유지)

**API 키 관리**: `app.config.js`의 `extra` + `eas.json` 환경변수. 코드에 하드코딩 절대 금지.

---

### ADR-004: V1 TTS = AVSpeechSynthesizer (Supertonic은 V2)

**결정**: iOS 내장 `AVSpeechSynthesizer`로 V1 출시. V2에서 Supertonic으로 교체.

**이유**:
- Supertonic의 React Native 통합이 검증되지 않음 (`react-native-sherpa-onnx` iOS 실동작 미확인)
- Supertonic 모델 크기 ~130MB → 앱 첫 실행에서 모델 다운로드 필요 → UX 악영향
- AVSpeechSynthesizer: 즉시 사용 가능, 무료, 한국어 지원, 오프라인 동작
- V1 목표: "동작하는 알람". TTS 음질 개선은 V2 과제

**트레이드오프**:
- AVSpeechSynthesizer 한국어 음질이 로봇 같음 → 사용자가 수용 가능한 수준인지 베타에서 검증
- 베타 피드백에서 TTS 음질이 핵심 불만이면 V2를 앞당김

**V2 전환 계획**:
- `src/services/tts.ts`에 `TTSProvider` 인터페이스 정의
- V1: `AVSpeechSynthesizerProvider` 구현
- V2: `SupertonicProvider` 구현 + 런타임 교체
- 모델 파일은 앱 첫 실행 시 온디맨드 다운로드 (번들 포함 금지)

---

### ADR-005: 날씨 API = 기상청 단기예보 (OpenWeatherMap 대신)

**결정**: 기상청 공공데이터포털 단기예보 API

**이유**:
- 한국 동네 단위(격자 1km²) 강수 정확도가 기상청 > OpenWeatherMap
- PTY(강수형태) 필드로 눈/비/소나기를 명확히 구분 (OpenWeatherMap은 강수량만 제공)
- 무료 (일 10,000회, 앱 특성상 충분)

**트레이드오프**:
- WGS84 → 기상청 격자 좌표 변환 직접 구현 필요 (Lambert Conformal Conic)
- 응답 포맷 파싱 복잡 (카테고리 코드 + fcstDate + fcstTime 조합)
- 한국 외 지역 사용 불가 → V3 글로벌 확장 시 OpenWeatherMap 병행
- 서비스 점검 시간(04:00-04:10) 예외 처리 필요

**API 키 관리**: EAS 빌드 환경변수 `KMA_API_KEY`로 관리. 코드 하드코딩 금지.

---

### ADR-006: 앱 자체가 알람 시스템

**결정**: 사용자가 시계 앱 대신 이 앱에서 알람 설정. 앱이 `expo-notifications`로 알람 발화.

**이유**:
- iOS는 서드파티 앱이 네이티브 알람(시계 앱)을 수정하는 공개 API 없음
- Alarmy, Sleep Cycle, Pillow — 모두 같은 방식
- 알람 시간을 앱이 직접 제어해야 날씨 조건에 따른 시간 조정 가능

**트레이드오프**:
- 사용자가 기존 알람 앱 대신 이 앱을 신뢰해야 함 → 온보딩에서 명확히 안내
- 무음 모드에서 알람 안 울림 (Critical Alerts 없으면) → 온보딩 경고
- iOS 재부팅 시 앱이 실행되기 전까지 알람 자동 복원 불가 → 온보딩 안내
- Critical Alerts 권한 신청 계획: App Store 정식 출시 전 Apple에 신청 (건강/안전 카테고리)

---

### ADR-007: TTS 멘트 = 온디바이스 템플릿 (LLM API 없음)

**결정**: 온도/날씨 조건 → 사전 정의된 멘트 템플릿 매핑. Claude API 등 LLM 미사용.

**이유**:
- 클라우드 API 비용 0원 유지 (MVP 단계 비용 최소화)
- 알람 해제 시 네트워크 없어도 동작 (오프라인 필수)
- 멘트 품질이 예측 가능하고 App Store 심사 리스크 없음
- 응답 지연 없음 (네트워크 왕복 없이 즉시 생성)

**트레이드오프**:
- 멘트 다양성 제한 (같은 날씨면 항상 같은 멘트)
- V2에서 템플릿 변형 추가 (날씨별 3-5개 랜덤 선택)로 보완

---

### ADR-008: 날씨 캐시 TTL = 알람 시각 기준 상대 계산

**결정**: 기상청 API 응답을 AsyncStorage에 저장. TTL은 고정 24시간이 아닌 **알람 시각 기준 상대 계산**.

**TTL 유효 조건**: `fetchedAt + TTL > nextAlarmTime + 2h`
- 예: 알람 06:20, 자정 00:30에 fetch → TTL은 06:20 + 2h = 08:20까지만 유효
- 이유: 고정 24h TTL은 간밤에 fetch한 캐시가 다음 날 저녁까지 유효하다고 판단하는 오류 방지
- 백그라운드 기준 TTL: nextAlarmTime을 모를 경우(BackgroundFetch 등) 4시간 기본값 사용

**이유**:
- 단기예보는 하루 8회 발표 (3시간 간격) — 알람 시각 + 2h 이후까지만 유효하면 충분
- 일 10,000회 API 호출 한도 보호 (TTL 내에서는 캐시 재사용)

**캐시 무효화 조건**:
- TTL 초과 (nextAlarmTime + 2h 기준)
- 사용자가 위치 변경 (새 격자 좌표로 캐시 미스)
- 수동 새로고침 (설정 화면 "날씨 갱신" 버튼)

**캐시 키 구조**: `weather_cache_{nx}_{ny}_{date}` (위치 + 날짜 조합)

*이전 결정(24시간 고정 TTL)에서 변경됨 — CEO 리뷰 Outside Voice 이슈 #3 반영 (2026-04-18)*

---

### ADR-009: 알람 상태 관리 = AsyncStorage + 로컬 state (전역 상태 라이브러리 없음)

**결정**: Zustand/Jotai/Redux 미사용. AsyncStorage + React useState/useReducer.

**이유**:
- 화면 3개 (메인/알람해제/설정) — 전역 상태 공유 필요 최소
- 알람 설정은 AsyncStorage가 단일 진실 소스 → 메모리 상태는 파생값
- 의존성 추가 최소화

**트레이드오프**:
- 화면 간 상태 공유 시 prop drilling 발생 가능 → React Context로 보완 (라이브러리 없이)
- V2에서 복수 알람 추가 시 Zustand 도입 재검토

---

### ADR-010: BackgroundFetch = 보조 수단 (주 스케줄 아님)

**결정**: 알람 스케줄의 주 메커니즘은 알람 설정 시점의 즉시 스케줄. BackgroundFetch는 야간 예보 갱신용 보조.

**이유**:
- iOS BackgroundFetch는 실행 시각을 앱이 제어 불가 (OS가 결정)
- BackgroundFetch에 의존하면 알람 시각 결정이 불확실
- 알람 설정 시점(사용자 액션)에 API 호출 → 확실한 실행 보장

**BackgroundFetch 역할**:
- 전날 밤 예보 변경 감지 (예: 맑음 → 비로 변경)
- 변경 시 기존 Notification 취소 + 새 시각으로 재스케줄
- 실패해도 기존 스케줄 유지 → 알람 신뢰성 영향 없음
