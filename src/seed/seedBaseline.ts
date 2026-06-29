/**
 * Baseline seed — the MUST-HAVE records every fresh DB needs (new Neon branch, prod, etc.),
 * independent of demo content. Right now that's the `games` rows: the leaderboard resolves a game
 * by slug to get its id, so without them every score submit is rejected with `unknown_game`.
 *
 * Idempotent (find-or-create) — safe to re-run. Point DATABASE_URI at the target DB first.
 *
 * ⚠️ Run on Node 22, not 24: `payload run` uses tsx, which doesn't yet support Node 24's module
 *    loader (fails resolving `node:` imports). The "Seed database" GitHub workflow pins Node 22.
 *    Locally:  fnm use 22 && npm run seed:baseline
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { gamesSeed } from './m1SeedData'

const payload = await getPayload({ config })

let created = 0
let updated = 0

for (const g of gamesSeed) {
  const existing = await payload.find({
    collection: 'games',
    where: { slug: { equals: g.slug } },
    limit: 1,
    locale: 'ru',
  })
  const ruData = {
    slug: g.slug,
    title: g.title.ru,
    excerpt: g.excerpt?.ru,
    how: g.how?.ru,
    embed: g.embed,
    showCover: g.showCover ?? false,
    coverSeed: g.coverSeed,
    order: g.order ?? 0,
    _status: 'published' as const,
  }

  let id: number
  if (existing.docs[0]) {
    id = existing.docs[0].id as number
    await payload.update({ collection: 'games', id, locale: 'ru', data: ruData })
    updated++
  } else {
    const doc = await payload.create({ collection: 'games', locale: 'ru', data: ruData })
    id = doc.id as number
    created++
  }

  // en/de translations (localized fields), без перезаписи ru.
  await payload.update({
    collection: 'games',
    id,
    locale: 'en',
    data: { title: g.title.en, excerpt: g.excerpt?.en, how: g.how?.en },
  })
  await payload.update({
    collection: 'games',
    id,
    locale: 'de',
    data: {
      title: g.title.de ?? g.title.en,
      excerpt: g.excerpt?.de ?? g.excerpt?.en,
      how: g.how?.de ?? g.how?.en,
    },
  })
}

console.log(`Baseline seed: games +${created}/~${updated}.`)
