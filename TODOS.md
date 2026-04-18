# TODOS

## V1 내 처리 권장 (TestFlight 배포 전)

### AsyncStorage 스키마 버전 관리
- AlarmConfig에 `schemaVersion: number` 필드 추가 (ScheduledAlarm에는 이미 추가됨)
- `lib/storage.ts`에 마이그레이션 헬퍼 추가: 읽은 데이터의 schemaVersion이 현재보다 낮으면 변환 후 재저장
- 이유: TestFlight 반복 배포 중 구조 변경 시 기존 데이터 복원 실패 방지
- 시작점: `lib/storage.ts`, `src/constants/config.ts`에 `CURRENT_SCHEMA_VERSION = 1` 상수 정의

### KMA 격자 코드표 데이터셋 취득
- 기상청 기상자료개방포털에서 시/군/구 → 격자 좌표 코드표 다운로드
- `src/constants/kma-regions.json`으로 번들 (약 250개 행정구역)
- 이유: 수동 주소 picker 구현에 반드시 필요한 외부 의존성
- 블로킹: 이 파일 없으면 GPS 권한 거부 시 수동 주소 picker 구현 불가

---

# V2 이후

## V2 — bare workflow 전환 후

### WidgetKit 잠금화면 위젯
- 다음 알람 시각 + 날씨 아이콘을 잠금화면 위젯으로 표시
- bare workflow 전환 필요 (managed → bare 는 one-way door, V1 완료 후 진행)
- Expo WidgetKit 가이드 참조: `expo-modules-core` + native WidgetKit target 추가

### Siri 단축어 통합
- "알람 설정해줘" 단축어로 앱 없이 알람 변경
- SiriKit 복잡도 높음 (Intents extension, SiriKit donation 등)
- V1 핵심 기능 아님. V2 사용자 피드백 수집 후 우선순위 재검토

---

_이 파일은 CEO plan 리뷰 결과로 생성됨 (2026-04-18)_
