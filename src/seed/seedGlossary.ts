/**
 * Идемпотентный посев глоссария (upsert по source; закреплено тестом
 * tests/int/seeds.int.spec.ts, QA-18). Логика — в ./lib. Запуск: npm run seed:glossary
 * (использует `payload run`, который грузит .env и конфиг проекта; Node 22 — см. seedBaseline).
 *
 * ВАЖНО: используем top-level await, а НЕ floating `run().catch()`.
 * `payload run` делает `await import(script)` и сразу `process.exit(0)`, поэтому
 * плавающий промис не успел бы выполниться — процесс убивался до записи в БД.
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { seedGlossary } from './lib'
import { glossaryTerms } from './glossaryTerms'

const payload = await getPayload({ config })
const { created, updated } = await seedGlossary(payload)
console.log(`Глоссарий: создано ${created}, обновлено ${updated} (всего ${glossaryTerms.length}).`)
