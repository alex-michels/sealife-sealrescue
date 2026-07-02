/**
 * Идемпотентный посев демо-контента M1 (Content + Species + Games), RU/EN/DE.
 * Запуск: npm run seed:m1 (`payload run`, Node 22 — см. seedBaseline). Логика — в ./lib;
 * идемпотентность и локали закреплены тестом tests/int/seeds.int.spec.ts (QA-18).
 *
 * Top-level await (НЕ floating promise): `payload run` делает await import + сразу
 * process.exit, плавающий промис не успел бы записать в БД (см. seedGlossary).
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { seedM1 } from './lib'

const payload = await getPayload({ config })
const { content, species, games } = await seedM1(payload)
console.log(
  `M1 seed: content +${content.created}/~${content.updated}, species +${species.created}/~${species.updated}, games +${games.created}/~${games.updated}.`,
)
