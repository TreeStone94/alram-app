# Step 4: kma-regions

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "lib/kma-address.ts" 섹션 (KmaRegion 인터페이스, 데이터셋 형식)
- `/docs/PRD.md` — Step 2 위치 권한 섹션 (시/도 → 시/군/구 2단계 picker)
- `/CLAUDE.md`
- `/TODOS.md` — KMA 격자 코드표 항목 (임시 데이터셋 안내)
- `src/lib/kma-grid.ts` — 이전 step 산출물

## 작업

수동 주소 picker용 KMA 격자 데이터셋과 조회 함수를 구현한다.

**중요**: 기상청 공식 코드표(~250개 행정구역) 취득 전 임시 데이터셋으로 시작한다.
50개 주요 시/군/구를 하드코딩한다. 공식 데이터셋 교체 시 `kma-regions.json`만 교체하면 된다.

### `src/constants/kma-regions.json`

아래 형식으로 전국 주요 50개 지역을 포함한다:

```json
[
  { "sido": "서울특별시", "sigungu": "종로구",  "nx": 60, "ny": 127 },
  { "sido": "서울특별시", "sigungu": "중구",    "nx": 60, "ny": 127 },
  { "sido": "서울특별시", "sigungu": "강남구",  "nx": 61, "ny": 126 },
  { "sido": "서울특별시", "sigungu": "마포구",  "nx": 59, "ny": 127 },
  { "sido": "서울특별시", "sigungu": "서초구",  "nx": 61, "ny": 125 },
  { "sido": "서울특별시", "sigungu": "송파구",  "nx": 62, "ny": 126 },
  { "sido": "서울특별시", "sigungu": "강서구",  "nx": 58, "ny": 126 },
  { "sido": "서울특별시", "sigungu": "노원구",  "nx": 61, "ny": 129 },
  { "sido": "서울특별시", "sigungu": "은평구",  "nx": 59, "ny": 128 },
  { "sido": "부산광역시", "sigungu": "해운대구", "nx": 99, "ny": 75 },
  { "sido": "부산광역시", "sigungu": "중구",    "nx": 98, "ny": 76 },
  { "sido": "부산광역시", "sigungu": "사하구",  "nx": 96, "ny": 74 },
  { "sido": "대구광역시", "sigungu": "중구",    "nx": 89, "ny": 90 },
  { "sido": "대구광역시", "sigungu": "수성구",  "nx": 90, "ny": 89 },
  { "sido": "인천광역시", "sigungu": "중구",    "nx": 54, "ny": 125 },
  { "sido": "인천광역시", "sigungu": "남동구",  "nx": 55, "ny": 124 },
  { "sido": "광주광역시", "sigungu": "북구",    "nx": 58, "ny": 74 },
  { "sido": "광주광역시", "sigungu": "서구",    "nx": 57, "ny": 74 },
  { "sido": "대전광역시", "sigungu": "중구",    "nx": 67, "ny": 100 },
  { "sido": "대전광역시", "sigungu": "유성구",  "nx": 67, "ny": 100 },
  { "sido": "울산광역시", "sigungu": "중구",    "nx": 102, "ny": 84 },
  { "sido": "세종특별자치시", "sigungu": "세종시", "nx": 66, "ny": 103 },
  { "sido": "경기도", "sigungu": "수원시",   "nx": 60, "ny": 121 },
  { "sido": "경기도", "sigungu": "성남시",   "nx": 62, "ny": 123 },
  { "sido": "경기도", "sigungu": "고양시",   "nx": 57, "ny": 128 },
  { "sido": "경기도", "sigungu": "용인시",   "nx": 64, "ny": 119 },
  { "sido": "경기도", "sigungu": "부천시",   "nx": 56, "ny": 125 },
  { "sido": "경기도", "sigungu": "안산시",   "nx": 57, "ny": 121 },
  { "sido": "경기도", "sigungu": "화성시",   "nx": 57, "ny": 119 },
  { "sido": "경기도", "sigungu": "남양주시", "nx": 64, "ny": 128 },
  { "sido": "경기도", "sigungu": "안양시",   "nx": 59, "ny": 123 },
  { "sido": "경기도", "sigungu": "파주시",   "nx": 56, "ny": 131 },
  { "sido": "경기도", "sigungu": "의정부시", "nx": 61, "ny": 130 },
  { "sido": "경기도", "sigungu": "김포시",   "nx": 55, "ny": 128 },
  { "sido": "충청북도", "sigungu": "청주시", "nx": 69, "ny": 107 },
  { "sido": "충청남도", "sigungu": "천안시", "nx": 63, "ny": 110 },
  { "sido": "충청남도", "sigungu": "아산시", "nx": 60, "ny": 111 },
  { "sido": "충청남도", "sigungu": "당진시", "nx": 56, "ny": 113 },
  { "sido": "전라북도", "sigungu": "전주시", "nx": 63, "ny": 89 },
  { "sido": "전라북도", "sigungu": "익산시", "nx": 60, "ny": 91 },
  { "sido": "전라남도", "sigungu": "여수시", "nx": 73, "ny": 66 },
  { "sido": "전라남도", "sigungu": "순천시", "nx": 75, "ny": 72 },
  { "sido": "전라남도", "sigungu": "목포시", "nx": 50, "ny": 67 },
  { "sido": "경상북도", "sigungu": "포항시", "nx": 102, "ny": 94 },
  { "sido": "경상북도", "sigungu": "구미시", "nx": 84, "ny": 96 },
  { "sido": "경상북도", "sigungu": "경주시", "nx": 100, "ny": 91 },
  { "sido": "경상남도", "sigungu": "창원시", "nx": 91, "ny": 77 },
  { "sido": "경상남도", "sigungu": "진주시", "nx": 81, "ny": 75 },
  { "sido": "경상남도", "sigungu": "김해시", "nx": 97, "ny": 77 },
  { "sido": "강원도", "sigungu": "춘천시", "nx": 73, "ny": 134 },
  { "sido": "강원도", "sigungu": "원주시", "nx": 76, "ny": 122 },
  { "sido": "강원도", "sigungu": "강릉시", "nx": 92, "ny": 131 },
  { "sido": "강원도", "sigungu": "속초시", "nx": 87, "ny": 141 },
  { "sido": "제주특별자치도", "sigungu": "제주시",   "nx": 53, "ny": 38 },
  { "sido": "제주특별자치도", "sigungu": "서귀포시", "nx": 52, "ny": 33 }
]
```

### `src/lib/kma-address.ts`

```typescript
import type regions from '@/constants/kma-regions.json';

export interface KmaRegion {
  sido: string;
  sigungu: string;
  nx: number;
  ny: number;
}

// 시/도 목록 반환 (중복 제거, 가나다 정렬)
export function getSidoList(): string[]

// 특정 시/도의 시/군/구 목록 반환 (가나다 정렬)
export function getSigunguList(sido: string): string[]

// 시/도 + 시/군/구로 KmaRegion 반환
// 없으면 null 반환
export function findRegion(sido: string, sigungu: string): KmaRegion | null
```

### `src/__tests__/lib/kma-address.test.ts`

```typescript
// getSidoList: 서울특별시, 부산광역시 포함
expect(getSidoList()).toContain('서울특별시');
expect(getSidoList()).toContain('부산광역시');

// 중복 없음
const list = getSidoList();
expect(new Set(list).size).toBe(list.length);

// getSigunguList: 서울의 구 목록
const seoulGu = getSigunguList('서울특별시');
expect(seoulGu).toContain('강남구');
expect(seoulGu).toContain('마포구');

// findRegion: 정상 케이스
const region = findRegion('서울특별시', '강남구');
expect(region).toEqual({ sido: '서울특별시', sigungu: '강남구', nx: 61, ny: 126 });

// findRegion: 없는 지역 → null
expect(findRegion('없는시', '없는구')).toBeNull();
```

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=kma-address
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. kma-regions.json에 54개 이상의 지역이 포함됐는지 확인한다.
3. 결과에 따라 `phases/1-lib/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/constants/kma-regions.json (54개 지역 임시 데이터), src/lib/kma-address.ts (getSidoList, getSigunguList, findRegion) 구현. 테스트 통과. 공식 데이터셋 교체 시 JSON만 교체하면 됨."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- 이 데이터셋이 확정 데이터라고 가정하지 마라. 이유: TODOS.md에 명시된 것처럼 기상청 공식 코드표 취득 후 교체 필요. 함수 인터페이스만 유지되면 JSON 교체로 충분하다.
- `kma-grid.ts`의 toKmaGrid로 격자 좌표를 동적 계산해 JSON을 대체하지 마라. 이유: picker는 기상청이 제공하는 행정구역 기준 격자 좌표를 사용해야 한다. 동적 계산 결과와 일치 보장이 없다.
- nx, ny 값을 임의로 추정해 데이터셋에 넣지 마라. 위의 지정된 값을 그대로 사용하라.
