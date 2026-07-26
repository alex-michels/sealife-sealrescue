/**
 * Разовая чистка ПЕРЕД сужением enum локалей до ru/en (удаление немецкого как языка сайта,
 * 2026-07-26). Payload/drizzle не может сузить `public._locales`, пока в БД есть строки с
 * `_locale = 'de'` — ALTER TYPE падает с `invalid input value for enum _locales: "de"`.
 *
 * Скрипт удаляет немецкие строки из ВСЕХ таблиц, где есть колонка `_locale`, и только потом
 * имеет смысл гонять `scripts/push-dev-schema.mts`.
 *
 * ⚠️ УДАЛЯЕТ ДАННЫЕ. Гонять только против dev/CI-БД. Для stage/prod правильный путь — миграция
 * (Roadmap: миграции вместо push перед первым durable-окружением), а не этот скрипт.
 *
 * Запуск: npx tsx scripts/drop-de-locale-rows.mts
 */
import 'dotenv/config'
import { Client } from 'pg'

const uri = process.env.DATABASE_URI
if (!uri) {
  console.error('DATABASE_URI не задан')
  process.exit(1)
}

const client = new Client({ connectionString: uri })
await client.connect()

const { rows: tables } = await client.query<{ table_name: string }>(
  `SELECT table_name FROM information_schema.columns
   WHERE table_schema = 'public' AND column_name = '_locale'
   ORDER BY table_name`,
)

let total = 0
for (const { table_name } of tables) {
  const res = await client.query(`DELETE FROM "${table_name}" WHERE _locale::text = 'de'`)
  if (res.rowCount) {
    console.log(`${table_name}: -${res.rowCount}`)
    total += res.rowCount
  }
}

console.log(`таблиц с _locale: ${tables.length}; удалено строк: ${total}`)
await client.end()
