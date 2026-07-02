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
        'src/seed/**', // данные сидов + payload-run обёртки; логика (lib.ts) закрыта tests/int/seeds.int.spec.ts (QA-18), но данные раздували бы метрику
        'src/mock/**', // сэмпл-данные dev-моков
      ],
      // Порог — QA-10: ratchet, только растёт (актуалы после QA-15: lines 88 / stmts 87 /
      // funcs 88 / branches 74). Запас ~8 п.п. под новый ещё-не-покрытый код.
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 65,
      },
    },
  },
})
