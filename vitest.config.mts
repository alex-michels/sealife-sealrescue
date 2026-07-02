import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * Два слоя Vitest (QA-10, карта уровней — docs/local-development.md § Тесты):
 *  - unit: чистая логика, БЕЗ БД/DOM — секунды, гоняется первым;
 *  - int:  Payload local API + тестовая БД (jsdom для React-хелперов).
 * `npm run test:unit` / `test:int` — по отдельности, `test:coverage` — оба + порог покрытия.
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.unit.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'int',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['tests/int/**/*.int.spec.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      // Покрытие меряем по коду, который тестируется Vitest'ом (unit+int).
      // src/app (страницы/компоненты) — территория Playwright e2e, в пороге не участвует.
      include: ['src/**'],
      exclude: [
        'src/app/**',
        'src/payload-types.ts',
        'src/seed/**', // скрипты сидов гоняются вручную (QA-18 добавит им int-тесты)
        'src/mock/**', // сэмпл-данные dev-моков
      ],
      // Порог — QA-10: старт 40%, повышать по мере закрытия QA-13…QA-20 (ratchet: порог
      // только растёт). branches ниже: ветвление сосредоточено в endpoint-ветках
      // leaderboard.ts — поднять до 40 вместе с контракт-тестами QA-15.
      thresholds: {
        lines: 40,
        functions: 40,
        statements: 40,
        branches: 18,
      },
    },
  },
})
