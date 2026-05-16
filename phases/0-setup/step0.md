# Step 0: expo-init

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md`
- `/CLAUDE.md`

## 작업

Cloak Alarm React Native + Expo managed workflow 프로젝트를 초기화한다.
현재 디렉토리에는 `docs/`, `scripts/`, `phases/`, `CLAUDE.md`, `TODOS.md`, `package.json`(빈 의존성)이 존재한다.
**기존 파일을 삭제하지 말고** 현재 위치에서 직접 파일을 추가/수정한다.

### 1. `package.json` (기존 파일 교체)

아래 스크립트와 의존성을 포함해 완전한 package.json으로 교체한다.
버전은 Expo 최신 안정 버전 기준 호환 버전을 사용한다.

필수 포함 dependencies:
- `expo`, `expo-router`, `expo-notifications`, `expo-task-manager`, `expo-background-fetch`
- `expo-location`, `expo-speech`, `expo-constants`
- `@react-native-async-storage/async-storage`
- `react`, `react-native`

필수 포함 devDependencies:
- `typescript`, `@types/react`
- `jest`, `jest-expo`, `babel-jest`, `@testing-library/react-native`, `@types/jest`
- `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`

필수 포함 scripts:
```json
{
  "start": "expo start",
  "ios": "expo run:ios",
  "test": "jest --passWithNoTests",
  "test:watch": "jest --watch",
  "typecheck": "tsc --noEmit",
  "lint": "eslint src --ext .ts,.tsx --max-warnings 0"
}
```

`"main"` 필드: `"expo-router/entry"`

### 2. `app.config.js`

```javascript
export default {
  expo: {
    name: 'Cloak Alarm',
    slug: 'cloak-alarm',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'cloak-alarm',
    ios: {
      bundleIdentifier: 'com.cloakalarm.app',
      supportsTablet: false,
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#ffffff',
        },
      ],
      'expo-location',
      'expo-background-fetch',
      'expo-task-manager',
    ],
    extra: {
      kmaApiKey: process.env.KMA_API_KEY,
      eas: { projectId: 'TBD' },
    },
  },
};
```

### 3. `tsconfig.json`

`strict: true`, path alias `@/*` → `./src/*` 설정.

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 4. `babel.config.js`

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./src'],
        alias: { '@': './src' },
      }],
    ],
  };
};
```

`babel-plugin-module-resolver`도 devDependencies에 추가해야 한다.

### 5. `jest.config.js`

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['@testing-library/react-native/extend-expect'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};
```

### 6. `.gitignore`

node_modules, .expo, dist, .env, .env.local, *.key, build/ 포함.

### 7. `.env.example`

```
KMA_API_KEY=your_kma_api_key_here
```

### 8. `eas.json`

```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "KMA_API_KEY": "@kma-api-key-dev" }
    },
    "production": {
      "env": { "KMA_API_KEY": "@kma-api-key-prod" }
    }
  }
}
```

### 9. `assets/` 디렉토리

빈 placeholder PNG 파일 생성:
- `assets/notification-icon.png` (1x1 투명 PNG — app.config.js 참조 에러 방지용)

### 10. `src/app/_layout.tsx` (placeholder)

이후 step에서 교체될 최소 구현:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 11. `src/app/index.tsx` (placeholder)

```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Cloak Alarm</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
```

### 12. 의존성 설치

모든 파일 생성 후 실행:

```bash
npm install
```

## Acceptance Criteria

```bash
npm run typecheck   # 타입 에러 없음 (exit 0)
npm test            # 테스트 없어도 성공 (--passWithNoTests)
```

## 검증 절차

1. 위 AC 커맨드를 순서대로 실행한다.
2. 아래 항목을 체크한다:
   - `node_modules/` 디렉토리가 생성됐는가?
   - `package.json`에 expo, expo-router, expo-notifications, expo-speech, expo-location, @react-native-async-storage/async-storage가 모두 포함됐는가?
   - `tsconfig.json`에 `"strict": true`가 있는가?
   - `app.config.js`의 `extra.kmaApiKey`가 `process.env.KMA_API_KEY`를 참조하는가?
   - `src/app/_layout.tsx`, `src/app/index.tsx`가 존재하는가?
3. 결과에 따라 `phases/0-setup/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "Expo managed workflow 초기화, npm install, typecheck 통과. src/app placeholder 생성."`
   - 실패 → `"status": "error"`, `"error_message": "구체적 에러 메시지"`

## 금지사항

- `KMA_API_KEY`를 코드에 하드코딩하지 마라. 이유: 환경변수로만 관리 (CLAUDE.md CRITICAL, ADR-003).
- `expo eject` 또는 bare workflow 전환하지 마라. 이유: V1은 managed workflow 유지 (ADR-001).
- `@types/react-native`를 추가하지 마라. 이유: React Native가 자체 타입을 제공하며 해당 패키지는 deprecated stub이다.
- `src/` 외부에 컴포넌트/서비스 파일을 만들지 마라. 이유: CLAUDE.md 파일 구조 규칙.
- placeholder 파일(`_layout.tsx`, `index.tsx`)의 실제 로직을 이 step에서 구현하지 마라. 이유: Phase 3에서 교체됨.
- 기존 `docs/`, `scripts/`, `phases/` 디렉토리의 파일을 수정하지 마라. 이유: 이 step의 작업 범위가 아님.
