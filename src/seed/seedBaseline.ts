/**
 * Baseline seed — the MUST-HAVE records every fresh DB needs (new Neon branch, prod, etc.),
 * independent of demo content. Right now that's the `games` rows: the leaderboard resolves a game
 * by slug to get its id, so without them every score submit is rejected with `unknown_game`.
 *
 * Idempotent (upsert by slug) — safe to re-run; закреплено тестом tests/int/seeds.int.spec.ts
 * (QA-18). Логика — в ./lib (общая с seed:m1). Point DATABASE_URI at the target DB first.
 *
 * ⚠️ Run on Node 22, not 24: `payload run` uses tsx, which doesn't yet support Node 24's module
 *    loader (fails resolving `node:` imports). The "Seed database" GitHub workflow pins Node 22.
 *    Locally:  fnm use 22 && npm run seed:baseline
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { seedBaseline } from './lib'

const payload = await getPayload({ config })
const { games } = await seedBaseline(payload)
console.log(`Baseline seed: games +${games.created}/~${games.updated}.`)
