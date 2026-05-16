# Step 2: tts-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — "services/tts.ts", "services/tts-avss.ts" 섹션
- `/docs/ADR.md` — ADR-004 (V1 TTS = AVSpeechSynthesizer, TTSProvider 인터페이스로 교체 가능하게)
- `/CLAUDE.md`
- `src/types/tts.ts` — TTSProvider 인터페이스
- `src/lib/weather-template.ts` — 이전 step 산출물

## 작업

`TTSProvider` 인터페이스를 구현하는 `expo-speech` 기반 TTS 서비스를 만든다.

### `src/services/tts.ts`

싱글턴 factory. 플랫폼에 따라 적절한 TTSProvider 인스턴스를 반환한다.

```typescript
import type { TTSProvider } from '@/types/tts';

// 앱에서 사용할 TTSProvider 인스턴스 반환
// V1: AVSSProvider (expo-speech 기반)
export function getTTSProvider(): TTSProvider

// 편의 함수: WeatherForecast + style → 스크립트 생성 후 speak
// forecast가 null이면 fallback 멘트 사용
export async function speakWeatherBrief(
  forecast: import('@/types/weather').WeatherForecast | null
): Promise<void>
```

### `src/services/tts-avss.ts`

`expo-speech`를 사용한 `TTSProvider` 구현:

```typescript
import * as Speech from 'expo-speech';
import type { TTSProvider } from '@/types/tts';

export class AVSSProvider implements TTSProvider {
  async speak(text: string): Promise<void>
  // expo-speech의 Speech.speak() 호출
  // 한국어 설정: language = 'ko-KR'
  // onDone 콜백으로 Promise 완료
  // onError 콜백으로 에러 처리 (Promise reject가 아닌 무음 처리 — 에러 삼키기)

  stop(): void
  // Speech.stop() 호출. 실패해도 에러 throw 금지.

  isAvailable(): boolean
  // 항상 true (expo-speech는 iOS에서 항상 사용 가능)
}
```

**speak() 에러 처리 규칙**:
- TTS 실패는 무음 처리 (CLAUDE.md 설계 원칙, PRD §2)
- onError 콜백 발생 시 → Promise를 reject하지 말고 resolve로 완료
- 에러는 `appendErrorLog`로 로컬 로그만 남긴다

**stop() 동작**:
- 알람 해제(SlideToDisarm) 시 호출됨
- POC에서 확인 필요: expo-speech의 Speech.stop()이 즉시 중단되는지 여부
- 중단이 작동하지 않아도 앱은 정상 동작해야 함 (해제 후 화면 전환이 우선)

## Acceptance Criteria

```bash
npm run typecheck
npm test -- --testPathPattern=tts
```

테스트 파일 `src/__tests__/services/tts.test.ts`:
- `expo-speech` 모킹 후 speak() 호출 확인
- speak() 에러 발생 시 throw하지 않고 resolve 확인
- stop() 호출 시 throw하지 않음 확인

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. speak()에서 onError가 발생해도 Promise가 reject되지 않고 resolve되는지 테스트로 확인한다.
3. 결과에 따라 `phases/2-services/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "src/services/tts.ts (factory), src/services/tts-avss.ts (AVSSProvider, expo-speech). speak 에러 무음처리. 테스트 통과."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- TTS 실패 시 사용자에게 에러를 표시하지 마라. 이유: 알람 해제 UX 방해 금지 (CLAUDE.md 설계 원칙).
- 클라우드 TTS API(AWS Polly, Google TTS 등)를 호출하지 마라. 이유: 오프라인 동작 필수 (CLAUDE.md CRITICAL, ADR-007).
- Supertonic, react-native-sherpa-onnx를 V1에서 구현하지 마라. 이유: ADR-004 — V2 작업.
- speak()에서 에러를 Promise.reject으로 전파하지 마라. 이유: alarm-ring.tsx에서 try-catch로 TTS 에러를 처리하지 않으므로 unhandled rejection이 된다.
