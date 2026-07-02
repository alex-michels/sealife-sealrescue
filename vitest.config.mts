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
          // Int-файлы делят одну БД: параллельный boot Payload гоняет drizzle push
          // наперегонки (DDL-гонка «constraint does not exist») — только последовательно.
          fileParallelism: false,
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
      // Порог — QA-10: ratchet, только растёт (актуалы после QA-13: lines 49 / stmts 51 /
      // funcs 64 / branches 29). branches ниже прочих: ветвление сосредоточено в
      // endpoint-ветках leaderboard.ts — поднять до 40 вместе с контракт-тестами QA-15.
      thresholds: {
        lines: 45,
        functions: 55,
        statements: 46,
        branches: 25,
      },
    },
  },
})
