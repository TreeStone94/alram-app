# Step 2: weather-template

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "lib/weather-template.ts" 섹션 (엣지케이스, 일교차 보정 조건)
- `/docs/PRD.md` — "TTS 멘트 생성 규칙" 섹션 (온도 구간, PTY 멘트, 일교차 보정)
- `/CLAUDE.md`
- `src/types/weather.ts`
- `src/constants/tts-templates.ts` — 이전 step 산출물 (멘트 상수)

## 작업

온도/날씨 조건 → TTS 멘트 문자열 생성 함수를 구현하고 Jest 테스트를 작성한다.
**테스트를 먼저 작성하라** (TDD).

### `src/__tests__/lib/weather-template.test.ts` (먼저 작성)

필수 테스트 케이스:

**온도 구간:**
```typescript
// 28°C 이상
const result = generateScript({ currentTemp: 30, maxTemp: 32, minTemp: 25, precipType: 0, style: 'FRIEND' });
expect(result).toContain('반팔 한 장이면 충분해요');

// 12-19°C
const result2 = generateScript({ currentTemp: 15, maxTemp: 20, minTemp: 10, precipType: 0, style: 'FRIEND' });
expect(result2).toContain('가디건');

// 4°C 미만
const result3 = generateScript({ currentTemp: 1, maxTemp: 3, minTemp: -2, precipType: 0, style: 'FRIEND' });
expect(result3).toContain('두꺼운 패딩 필수');
```

**일교차 보정 (두 조건 모두 충족해야 멘트 포함):**
```typescript
// TMX >= 15 AND (TMX - TMN) >= 10 → 멘트 포함
const withDiurnal = generateScript({ currentTemp: 10, maxTemp: 22, minTemp: 8, precipType: 0, style: 'FRIEND' });
expect(withDiurnal).toContain('낮엔 덥지만');

// TMX < 15 → 영하권, 멘트 생략
const noMsg = generateScript({ currentTemp: -2, maxTemp: 4, minTemp: -6, precipType: 0, style: 'FRIEND' });
expect(noMsg).not.toContain('낮엔 덥지만');

// (TMX - TMN) < 10 → 일교차 작음, 멘트 생략
const smallRange = generateScript({ currentTemp: 18, maxTemp: 20, minTemp: 14, precipType: 0, style: 'FRIEND' });
expect(smallRange).not.toContain('낮엔 덥지만');
```

**PTY 강수 멘트:**
```typescript
// PTY=1 (비)
const rain = generateScript({ currentTemp: 15, maxTemp: 18, minTemp: 12, precipType: 1, style: 'FRIEND' });
expect(rain).toContain('우산 꼭 챙기세요');

// PTY=3 (눈)
const snow = generateScript({ currentTemp: -1, maxTemp: 1, minTemp: -3, precipType: 3, style: 'FRIEND' });
expect(snow).toContain('눈 와요');
```

**null 처리:**
```typescript
// currentTemp null → 온도 멘트 생략
const noTemp = generateScript({ currentTemp: null, maxTemp: 20, minTemp: 10, precipType: 0, style: 'FRIEND' });
expect(noTemp).not.toMatch(/°C|패딩|가디건|반팔|긴팔|코트/);

// 모든 데이터 null → fallback 멘트
const allNull = generateScript({ currentTemp: null, maxTemp: null, minTemp: null, precipType: 0, style: 'FRIEND' });
expect(allNull).toContain('날씨 정보를 가져오지 못했어요');
```

**FRIEND 스타일 prefix:**
```typescript
const result = generateScript({ currentTemp: 20, maxTemp: 25, minTemp: 15, precipType: 0, style: 'FRIEND' });
expect(result.startsWith('야~ 일어나!')).toBe(true);
```

### `src/lib/weather-template.ts`

```typescript
import type { PrecipType } from '@/types/weather';

export type TtsStyle = 'FRIEND';  // V1 고정. V2에서 확장.

export interface TemplateInput {
  currentTemp: number | null;
  maxTemp: number | null;
  minTemp: number | null;
  precipType: PrecipType;
  style: TtsStyle;
}

export function generateScript(input: TemplateInput): string
```

구현 규칙:
1. prefix 항상 포함 (style='FRIEND' → "야~ 일어나!")
2. currentTemp !== null → 온도 구간 멘트 추가 (TEMP_MESSAGES 상수 참조)
3. precipType !== 0 → 강수 멘트 추가 (PRECIP_MESSAGES 상수 참조)
4. 일교차 보정 조건: `maxTemp !== null && minTemp !== null && (maxTemp - minTemp) >= 10 && maxTemp >= 15` → DIURNAL_MESSAGE 추가
5. 모든 데이터 null (currentTemp, maxTemp, minTemp 모두 null) AND precipType === 0 → FALLBACK_MESSAGE만 반환
6. 멘트 구분자: ". " (마침표+공백)

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=weather-template
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 일교차 보정 조건 테스트가 모두 통과됐는지 확인한다 (TMX < 15 케이스 포함).
3. 결과에 따라 `phases/1-lib/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/lib/weather-template.ts 구현. generateScript, FRIEND 스타일. 일교차 보정(TMX>=15 AND 차이>=10), PTY 멘트, null 처리 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "실패 케이스와 에러 메시지"`

## 금지사항

- 일교차 보정 조건에서 `TMX >= 15` 체크를 누락하지 마라. 이유: 영하권(예: TMX 4°C, TMN -6°C)에서 "낮엔 덥지만" 멘트가 나오는 것을 방지하는 핵심 조건 (PRD §2, ARCHITECTURE.md 명시).
- 멘트 내용을 임의로 변경하지 마라. 이유: PRD가 확정된 UX 스펙이며, `tts-templates.ts` 상수를 사용해야 한다.
- 클라우드 API, LLM을 호출하지 마라. 이유: 오프라인 동작 필수 (CLAUDE.md CRITICAL, ADR-007).
- 테스트 없이 구현부터 작성하지 마라. 이유: CLAUDE.md TDD 원칙.
