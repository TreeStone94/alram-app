---
name: alram-review
description: Cloak Alarm alram-app 프로젝트의 코드 변경을 리뷰할 때 사용한다. 아키텍처 준수, Expo React Native 제약, TDD 테스트, 알람/날씨/TTS 신뢰성, 개인정보/API 키 규칙, 빌드 검증을 확인한다. 사용자가 리뷰, 코드 점검, diff/PR 검토, 구현 품질 확인, 변경사항 검증을 요청하면 이 스킬을 사용한다.
---

# Alram Review

이 스킬은 Cloak Alarm 앱의 변경 사항을 코드 리뷰할 때 사용한다. 스타일 지적보다 버그, 회귀 위험, 누락된 테스트, 프로젝트 규칙 위반을 우선해서 확인한다.

## 필수 컨텍스트

리뷰 전에 다음 파일을 먼저 읽어라:

- 저장소 루트의 `AGENTS.md` 또는 `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR.md`
- 변경사항이 제품 동작, 날씨, 알람, TTS, 위치, 알림, 에러 처리와 관련 있으면 `docs/PRD.md`
- 변경사항이 UI와 관련 있으면 `docs/UI_GUIDE.md`

그런 다음 실제 변경사항을 확인하라:

```bash
git status --short
git diff --stat
git diff
```

사용자가 특정 커밋, 브랜치, 파일 리뷰를 요청하면 전체 작업 트리 대신 해당 대상을 확인하라.

## 리뷰 체크리스트

변경사항을 다음 기준으로 검증하라:

- 아키텍처: 파일이 `src/components`, `src/services`, `src/lib`, `src/tasks`, `src/hooks`, `src/types`, `src/constants` 경계를 지키는가?
- 기술 스택: React Native, Expo SDK, Expo Router, TypeScript strict mode, ADR의 기술 결정을 벗어나지 않았는가?
- TDD/테스트: 새 동작에 대한 테스트가 변경사항에 포함되어 있는가?
- 알람 신뢰성: 날씨 실패 시 항상 기본 알람 시간으로 폴백하는가?
- 날씨 API 보안: `KMA_API_KEY`를 하드코딩하거나 AsyncStorage에 저장하지 않는가?
- 오프라인 규칙: TTS 또는 날씨 멘트 생성을 위해 클라우드 LLM을 호출하지 않는가?
- TTS 동작: TTS는 알람 해제 후 foreground에서만 실행되고, 실패 시 무음 처리되는가?
- 에러 처리: 사용자에게 보이는 상태마다 로딩/에러/빈 상태 UI가 있는가?
- 로컬 로그: 에러 로그는 외부 전송 없이 로컬에만 저장되고 최대 50건으로 제한되는가?
- iOS 제약: iOS 네이티브 Clock 알람을 수정할 수 있다고 가정하지 않는가?

## 검증

`node_modules`가 있으면 다음 명령을 실행하라:

```bash
npm run lint
npm run typecheck
npm run test
```

명령을 실행할 수 없으면 정확한 이유를 적어라. 리뷰 대상에 네이티브 알람에서 TTS로 이어지는 흐름이 포함되면, 실기기 POC가 필요하고 시뮬레이터 검증만으로는 부족하다고 명시하라.

## 출력 형식

결과는 심각도 순서의 발견사항으로 시작하라. 각 발견사항에는 가능하면 파일/라인, 영향, 구체적인 수정 방향을 포함하라.

발견사항 뒤에는 다음 표를 포함하라:

```markdown
| 항목 | 결과 | 비고 |
|------|------|------|
| 아키텍처 준수 | ✅/❌ | ... |
| 기술 스택 준수 | ✅/❌ | ... |
| 테스트 존재 | ✅/❌ | ... |
| CRITICAL 규칙 | ✅/❌ | ... |
| 빌드 가능 | ✅/❌ | ... |
```

마지막에는 실행한 검증 명령과 남은 질문을 적어라. 발견사항이 없으면 그 사실을 명확히 말하고, 남은 테스트 또는 실기기 검증 공백을 언급하라.
