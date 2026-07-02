import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config.js'

/**
 * Создаёт/актуализирует схему БД через drizzle push (QA-09, e2e-job в CI).
 *
 * Зачем: e2e в CI бегут против прод-сборки, а `next build` (NODE_ENV=production) пререндерит
 * страницы live-запросами к Payload И не делает push — на пустом ephemeral Postgres сборка
 * упала бы. Боот Payload вне production включает push и готовит схему ДО `npm run build`.
 *
 * Запуск: `npx tsx scripts/push-dev-schema.mts` (tsx, НЕ `payload run` — тот сломан на Node 24,
 * см. docs/DEPLOYMENT.md §9). Идемпотентно: на актуальной схеме push — no-op.
 */
const payload = await getPayload({ config })
await payload.db.destroy?.()
console.log('DB schema is up to date (drizzle push)')
process.exit(0)
