import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    // 1~4부 → A/B/C 재구성으로 인해 visible 라우팅에서 빠진 옛 페이즈/본문/가이드.
    // 새 구조가 안정화되면 별도 정리 PR로 삭제할 예정 — 그 전까지 lint에서 제외.
    'src/phases/_legacy/**',
    'src/textbook/pages/_legacy/**',
    'src/data/_legacy/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
