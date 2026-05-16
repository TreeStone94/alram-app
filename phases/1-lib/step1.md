# Step 1: weather-parser

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "lib/weather-parser.ts" 섹션 (파싱 로직, nearestSlot, precipWindow)
- `/docs/PRD.md` — "날씨 API 상세 스펙" 섹션 (응답 필드, base_time)
- `/CLAUDE.md`
- `src/types/weather.ts`
- `src/lib/kma-grid.ts` — 이전 step 산출물

## 작업

기상청 단기예보 API 응답을 파싱하는 함수를 구현하고 Jest 테스트를 작성한다.
**테스트를 먼저 작성하라** (TDD).

### `src/__tests__/lib/weather-parser.test.ts` (먼저 작성)

필수 테스트 케이스:

**nearestSlot:**
```typescript
// "06:35" → 앞(0600)이 더 가까움
expect(nearestSlot('06:35', ['0500', '0600', '0700'])).toBe('0600');
// "06:50" → 뒤(0700)이 더 가까움
expect(nearestSlot('06:50', ['0600', '0700'])).toBe('0700');
// "00:05" → 자정 경계
expect(nearestSlot('00:05', ['0000', '0100'])).toBe('0000');
// "23:55" → 2359에 가장 가까운 슬롯
expect(nearestSlot('23:55', ['2300', '2400'])).toBe('2300'); // 2400 대신 2300 선택
```

**precipWindow:**
```typescript
// 알람 06:20 → 05:20 ~ 08:20 범위 슬롯 반환
const window = precipWindow('06:20', ['0400', '0500', '0600', '0700', '0800', '0900']);
expect(window).toContain('0500');
expect(window).toContain('0600');
expect(window).toContain('0700');
expect(window).toContain('0800');
expect(window).not.toContain('0400'); // -1h 이전 제외
expect(window).not.toContain('0900'); // +2h 이후 제외
```

**parseKmaResponse:**
- 정상 응답 → WeatherForecast 반환
- PTY 필드 없음 → `ParseError` throw
- 예상치 못한 구조 → `ParseError` throw
- TMX, TMN이 없을 때 → null (nullable 필드)

### `src/lib/weather-parser.ts`

```typescript
import type { WeatherForecast, PrecipType, SkyCondition } from '@/types/weather';

export class ParseError extends Error {
  constructor(message: string) { super(message); this.name = 'ParseError'; }
}

// fcstTime 슬롯 목록에서 alarmTime에 가장 가까운 슬롯 반환
// alarmTime: "HH:mm", slots: ["0600", "0700", ...]
export function nearestSlot(alarmTime: string, slots: string[]): string

// alarmTime 기준 -1h ~ +2h 범위에 포함되는 fcstTime 슬롯 목록 반환
// alarmTime: "HH:mm", allSlots: 응답에서 추출한 전체 fcstTime 목록
export function precipWindow(alarmTime: string, allSlots: string[]): string[]

// 기상청 API 응답 items 배열 + alarmTime → WeatherForecast
// alarmTime이 없으면 현재 시각 기준 nearestSlot 사용
export function parseKmaResponse(
  items: KmaItem[],
  nx: number,
  ny: number,
  alarmTime?: string
): WeatherForecast

// 기상청 API items 배열 항목 타입
export interface KmaItem {
  category: string;  // 'PTY', 'SKY', 'TMP', 'TMX', 'TMN', 'REH', 'WSD'
  fcstDate: string;  // "YYYYMMDD"
  fcstTime: string;  // "HH00"
  fcstValue: string;
}
```

파싱 로직 (ARCHITECTURE.md 기준):
- PTY: precipWindow 내 ANY PTY != 0 이면 해당 값을 precipType으로 기록
- SKY, TMP, REH, WSD: nearestSlot 기준 단일 값
- TMX, TMN: 당일 예보 중 최초 1건 (fcstDate === 오늘 날짜인 것 중 첫 번째)
- 숫자 파싱 실패 → null (throw 금지)
- PTY 항목 자체 없음 → ParseError throw

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=weather-parser
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. nearestSlot 경계 케이스("00:05", "23:55")가 통과됐는지 확인한다.
3. precipWindow 범위(-1h ~ +2h)가 정확한지 확인한다.
4. 결과에 따라 `phases/1-lib/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/lib/weather-parser.ts 구현. nearestSlot, precipWindow, parseKmaResponse. ParseError 포함. 모든 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "실패 케이스와 에러 메시지"`

## 금지사항

- precipWindow를 단일 nearestSlot으로 대체하지 마라. 이유: 새벽 비(알람과 무관한 시간대)로 인한 false positive 방지가 이 로직의 핵심 (ARCHITECTURE.md 주석 참조).
- 파싱 실패 시 0 또는 기본값을 반환하지 마라. 이유: 잘못된 날씨 데이터로 알람 시간이 틀어질 수 있음. PTY 필드 없음은 ParseError, 숫자 파싱 실패는 null.
- 테스트 없이 구현부터 작성하지 마라. 이유: CLAUDE.md TDD 원칙.
