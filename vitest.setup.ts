// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

/**
 * Изоляция тестовой БД (QA-11): задан `DATABASE_URI_TEST` → int-тесты идут в него,
 * НЕ в dev-БД. В CI изоляция полная и без этого (ephemeral Postgres на прогон);
 * локально без DATABASE_URI_TEST падаем на dev-БД — с громким предупреждением.
 * setupFiles выполняется до импорта payload.config, поэтому подмена срабатывает.
 *
 * NB: на e2e НЕ распространяется — Playwright тестирует сервер, который сам читает
 * DATABASE_URI; сид и сервер обязаны смотреть в одну БД (см. local-development.md § Тесты).
 */
if (process.env.DATABASE_URI_TEST) {
  process.env.DATABASE_URI = process.env.DATABASE_URI_TEST
} else if (!process.env.CI) {
  // process.stderr напрямую: console.* в setupFiles Vitest перехватывает и глотает.
  process.stderr.write(
    '\n⚠️  DATABASE_URI_TEST не задан — int-тесты идут в dev-БД (DATABASE_URI).\n' +
      '   Заведите отдельную БД/Neon-ветку и пропишите DATABASE_URI_TEST в .env\n' +
      '   (docs/local-development.md § Тесты).\n\n',
  )
}
