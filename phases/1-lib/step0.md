# Step 0: kma-grid

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "lib/kma-grid.ts" 섹션 (Lambert Conformal Conic 파라미터)
- `/docs/ADR.md` — ADR-005 (기상청 API 선택 이유)
- `/CLAUDE.md`
- `src/types/weather.ts` — GridCoord 타입 참조용

## 작업

WGS84 위경도 → 기상청 격자 좌표 변환 함수를 구현하고 Jest 테스트를 작성한다.
**테스트를 먼저 작성하고, 테스트를 통과하는 구현을 작성하라** (TDD).

### `src/__tests__/lib/kma-grid.test.ts` (먼저 작성)

아래 케이스를 반드시 포함한다:

```typescript
// 서울 중심 (표준 검증 좌표)
expect(toKmaGrid(37.5665, 126.9780)).toEqual({ nx: 60, ny: 127 });

// 제주시
expect(toKmaGrid(33.4996, 126.5312)).toEqual({ nx: 52, ny: 38 });

// 부산 해운대
expect(toKmaGrid(35.1631, 129.1636)).toEqual({ nx: 99, ny: 75 });

// 강릉 (동해안 경계값)
expect(toKmaGrid(37.7519, 128.8761)).toEqual({ nx: 92, ny: 131 });

// 음수 위도 (해외) — 결과값 자체보다 함수가 throw하지 않고 숫자를 반환하는지 확인
expect(() => toKmaGrid(-33.8688, 151.2093)).not.toThrow();
```

### `src/lib/kma-grid.ts`

ARCHITECTURE.md에 명시된 기상청 공식 변환 파라미터를 그대로 사용한다:

```typescript
export interface GridCoord { nx: number; ny: number; }

const KMA_PARAMS = {
  Re: 6371.00877,
  grid: 5.0,
  slat1: 30.0,
  slat2: 60.0,
  olon: 126.0,
  olat: 38.0,
  xo: 43,
  yo: 136,
} as const;

export function toKmaGrid(lat: number, lon: number): GridCoord
```

구현 알고리즘: Lambert Conformal Conic 투영 변환.
기상청 공식 문서의 수식을 사용하되, 직접 구현 또는 신뢰할 수 있는 공식을 참조하라.
결과는 `Math.floor`로 정수화한다.

## Acceptance Criteria

```bash
npm run typecheck   # 타입 에러 없음
npm test            # kma-grid.test.ts 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 테스트 결과에서 서울 좌표 `(60, 127)` 케이스가 통과됐는지 확인한다.
3. 결과에 따라 `phases/1-lib/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/lib/kma-grid.ts 구현. Lambert Conformal Conic 변환. 서울(60,127), 제주(52,38), 부산(99,75), 강릉(92,131) 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "실패한 테스트 케이스와 에러 메시지"`

## 금지사항

- `KMA_PARAMS` 상수를 ARCHITECTURE.md 값과 다르게 설정하지 마라. 이유: 기상청 공식 파라미터이며 변경 시 모든 격자 좌표가 틀어진다.
- 외부 npm 패키지(proj4 등)를 좌표 변환에 사용하지 마라. 이유: 앱 번들 크기 증가. 직접 구현으로 충분하다.
- 테스트 없이 구현부터 작성하지 마라. 이유: CLAUDE.md TDD 원칙.
