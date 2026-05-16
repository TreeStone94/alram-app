# Step 3: retry-cache

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "lib/retry.ts", "lib/cache.ts", "services/weather.ts" 캐시 TTL 정책 섹션
- `/docs/ADR.md` — ADR-008 (알람 시각 기준 상대 TTL)
- `/CLAUDE.md`
- `src/constants/config.ts` — RETRY_CONFIG, CACHE_CONFIG 상수

## 작업

API 재시도 유틸(`retry.ts`)과 알람 시각 기준 TTL 캐시(`cache.ts`)를 구현하고 Jest 테스트를 작성한다.
**테스트를 먼저 작성하라** (TDD).

### `src/__tests__/lib/retry.test.ts` (먼저 작성)

필수 테스트 케이스:

```typescript
// 1회 실패 후 성공
let attempts = 0;
const fn = jest.fn().mockImplementation(async () => {
  attempts++;
  if (attempts < 2) throw new Error('temporary');
  return 'ok';
});
const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
expect(result).toBe('ok');
expect(fn).toHaveBeenCalledTimes(2);

// 3회 모두 실패 → 에러 throw
const alwaysFail = jest.fn().mockRejectedValue(new Error('permanent'));
await expect(withRetry(alwaysFail, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow('permanent');
expect(alwaysFail).toHaveBeenCalledTimes(3);

// HTTP 400 → 재시도 없이 즉시 throw
class HttpError extends Error { constructor(public statusCode: number, msg: string) { super(msg); } }
const badRequest = jest.fn().mockRejectedValue(new HttpError(400, 'bad request'));
await expect(withRetry(badRequest, {
  maxAttempts: 3,
  baseDelayMs: 10,
  shouldRetry: (e) => !(e instanceof HttpError && e.statusCode < 500),
})).rejects.toThrow('bad request');
expect(badRequest).toHaveBeenCalledTimes(1); // 재시도 없음

// timeoutMs: AbortError → 재시도 카운트 포함
const slowFn = jest.fn().mockImplementation(() => new Promise(r => setTimeout(r, 5000)));
await expect(withRetry(slowFn, { maxAttempts: 2, baseDelayMs: 10, timeoutMs: 50 })).rejects.toThrow();
expect(slowFn).toHaveBeenCalledTimes(2); // 타임아웃도 재시도
```

### `src/__tests__/lib/cache.test.ts` (먼저 작성)

필수 테스트 케이스:

```typescript
// TTL 유효 조건: fetchedAt + TTL > nextAlarmTime + 2h
// 알람 06:20, 00:30에 fetch → 유효 (08:20까지 유효)
const alarm = new Date('2026-04-19T06:20:00+09:00');
const fetched = new Date('2026-04-19T00:30:00+09:00');
expect(isAlarmTimeTtlValid(fetched, alarm)).toBe(true);

// 알람 06:20, 05:00에 fetch → 유효 (fetch 시점에서 alarmTime+2h까지 충분히 여유)
const fetched2 = new Date('2026-04-19T05:00:00+09:00');
expect(isAlarmTimeTtlValid(fetched2, alarm)).toBe(true);

// 알람 06:20, 07:00에 fetch (알람 이후) → 만료
const fetchedAfter = new Date('2026-04-19T07:00:00+09:00');
expect(isAlarmTimeTtlValid(fetchedAfter, alarm)).toBe(false);

// 정확히 경계: fetchedAt === nextAlarmTime + 2h → 만료 (초과 조건이므로)
const fetchedAtBoundary = new Date('2026-04-19T08:20:00+09:00');
expect(isAlarmTimeTtlValid(fetchedAtBoundary, alarm)).toBe(false);
```

### `src/lib/retry.ts`

```typescript
export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  timeoutMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T>
```

구현 규칙:
- 각 시도마다 독립적인 `AbortController` 생성 (이전 시도의 abort가 다음에 영향 없도록)
- `timeoutMs` 내 fn() 미완료 시 → AbortError throw → shouldRetry 검사 없이 재시도
- exponential backoff: attempt n번째 재시도 대기 = `baseDelayMs * 2^(n-1)` (1s → 2s → 4s)
- `shouldRetry` 미제공 시 기본 동작: HTTP 400/401/403은 재시도 안함, 나머지는 재시도
- fn에 AbortSignal을 전달할 수 없는 경우 타임아웃은 Promise.race로 구현

### `src/lib/cache.ts`

```typescript
// 알람 시각 기준 TTL 유효 검사
// 조건: fetchedAt + TTL > nextAlarmTime + 2h
// "다음 알람 시각 + 2시간 이후에 fetch된 데이터는 유효하지 않다"는 의미
export function isAlarmTimeTtlValid(
  fetchedAt: Date,
  nextAlarmTime: Date
): boolean

// 캐시 키 생성
export function makeCacheKey(nx: number, ny: number, date: string): string
// 형식: `weather_cache_${nx}_${ny}_${date}` (date: "YYYYMMDD")
```

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern="retry|cache"
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. retry 테스트에서 HTTP 400 케이스(1회만 호출)와 timeout 케이스(재시도 포함)가 통과됐는지 확인한다.
3. cache 테스트에서 경계값(정확히 `nextAlarmTime + 2h`)이 만료로 처리됐는지 확인한다.
4. 결과에 따라 `phases/1-lib/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/lib/retry.ts (AbortController 타임아웃, exponential backoff), src/lib/cache.ts (alarm-time-relative TTL) 구현. 모든 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "실패 케이스와 에러 메시지"`

## 금지사항

- 고정 24시간 TTL을 `cache.ts`에 사용하지 마라. 이유: ADR-008에서 alarm-time-relative TTL로 변경됨. 고정 TTL은 간밤 캐시가 다음날 저녁까지 유효하다고 판단하는 오류를 유발한다.
- 동일한 `AbortController` 인스턴스를 여러 retry 시도에서 재사용하지 마라. 이유: 이전 시도의 abort 신호가 다음 시도에 영향을 미쳐 즉시 취소된다.
- `setTimeout`으로 재시도 딜레이를 jest.useFakeTimers 없이 테스트하지 마라. 이유: 테스트가 실제 시간만큼 대기하면 느려진다. 테스트에서는 `baseDelayMs: 10` 사용.
- 테스트 없이 구현부터 작성하지 마라. 이유: CLAUDE.md TDD 원칙.
