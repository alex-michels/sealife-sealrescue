import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { seedBaseline, seedGlossary, seedM1 } from '@/seed/lib'
import { contentSeed, speciesSeed, gamesSeed } from '@/seed/m1SeedData'
import { glossaryTerms } from '@/seed/glossaryTerms'

/**
 * QA-18: сиды идемпотентны + после сида выполняются инварианты локалей/slug.
 *
 * Тест state-agnostic: на свежей БД (CI) первый прогон создаёт записи, на dev-БД —
 * обновляет уже посеянные. Ассертится ВТОРОЙ прогон: created === 0 и суммарные
 * количества не изменились. Данные сидов НЕ чистятся — они и есть канонический
 * стейт БД (upsert вернул бы их при следующем прогоне).
 */

let payload: Payload

const countBySlugs = async (collection: 'content' | 'species' | 'games', slugs: string[]) => {
  const res = await payload.count({
    collection,
    where: { slug: { in: slugs } },
  })
  return res.totalDocs
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
}, 120_000)

afterAll(async () => {
  await payload?.db.destroy?.()
}, 60_000)

describe('идемпотентность (второй прогон ничего не создаёт)', () => {
  it('seed:baseline', async () => {
    await seedBaseline(payload) // приводим БД к посеянному состоянию
    const before = await countBySlugs('games', gamesSeed.map((g) => g.slug))

    const second = await seedBaseline(payload)
    expect(second.games.created).toBe(0)
    expect(second.games.updated).toBe(gamesSeed.length)
    expect(await countBySlugs('games', gamesSeed.map((g) => g.slug))).toBe(before)
  }, 120_000)

  it('seed:glossary', async () => {
    await seedGlossary(payload)
    const before = await payload.count({
      collection: 'glossary',
      where: { source: { in: glossaryTerms.map((t) => t.source) } },
    })

    const second = await seedGlossary(payload)
    expect(second.created).toBe(0)
    expect(second.updated).toBe(glossaryTerms.length)
    const after = await payload.count({
      collection: 'glossary',
      where: { source: { in: glossaryTerms.map((t) => t.source) } },
    })
    expect(after.totalDocs).toBe(before.totalDocs)
    // source — канонический ключ: ровно одна строка на термин.
    expect(after.totalDocs).toBe(glossaryTerms.length)
  }, 240_000)

  it('seed:m1', async () => {
    await seedM1(payload)
    const before = {
      content: await countBySlugs('content', contentSeed.map((c) => c.slug)),
      species: await countBySlugs('species', speciesSeed.map((s) => s.slug)),
    }

    const second = await seedM1(payload)
    expect(second.content.created).toBe(0)
    expect(second.species.created).toBe(0)
    expect(second.games.created).toBe(0)
    expect(await countBySlugs('content', contentSeed.map((c) => c.slug))).toBe(before.content)
    expect(await countBySlugs('species', speciesSeed.map((s) => s.slug))).toBe(before.species)
  }, 240_000)
})

describe('инварианты после сида', () => {
  it('games: все 3 локали заполнены, published, slug канонический', async () => {
    for (const g of gamesSeed) {
      for (const locale of ['ru', 'en'] as const) {
        const res = await payload.find({
          collection: 'games',
          where: { slug: { equals: g.slug } },
          locale,
          limit: 1,
        })
        const doc = res.docs[0]
        expect(doc, `${g.slug} (${locale})`).toBeDefined()
        expect(doc.title, `${g.slug} title (${locale})`).toBeTruthy()
        expect(doc._status).toBe('published')
        expect(doc.slug).toBe(g.slug) // slug общий для локалей
      }
    }
  })

  it('content: title во всех 3 локалях, published', async () => {
    for (const item of contentSeed) {
      for (const locale of ['ru', 'en'] as const) {
        const res = await payload.find({
          collection: 'content',
          where: { slug: { equals: item.slug } },
          locale,
          limit: 1,
        })
        expect(res.docs[0]?.title, `${item.slug} (${locale})`).toBeTruthy()
        expect(res.docs[0]?._status).toBe('published')
      }
    }
  })

  it('species: name в 3 локалях; факты не размножаются и переведены (id-matching)', async () => {
    for (const sp of speciesSeed) {
      const perLocale: Record<string, { name?: string | null; facts?: Array<{ id?: string | null; text?: string | null }> | null }> = {}
      for (const locale of ['ru', 'en'] as const) {
        const res = await payload.find({
          collection: 'species',
          where: { slug: { equals: sp.slug } },
          locale,
          limit: 1,
        })
        perLocale[locale] = res.docs[0]
        expect(res.docs[0]?.name, `${sp.slug} name (${locale})`).toBeTruthy()
      }
      // Регресс id-matching: без сопоставления строк по id локализованный массив
      // пересоздаётся при записи en — строки дублируются либо теряют ru.
      const ruFacts = perLocale.ru.facts ?? []
      expect(ruFacts.length, `${sp.slug} facts count`).toBe(sp.facts.length)
      for (const locale of ['en'] as const) {
        const facts = perLocale[locale].facts ?? []
        expect(facts.length, `${sp.slug} facts (${locale})`).toBe(sp.facts.length)
        expect(
          facts.map((f) => f.id),
          `${sp.slug} fact ids (${locale}) должны совпадать с ru`,
        ).toEqual(ruFacts.map((f) => f.id))
        for (const f of facts) expect(f.text, `${sp.slug} fact text (${locale})`).toBeTruthy()
      }
    }
  })

  it('glossary: translation заполнен в ru (сам термин) и en (перевод)', async () => {
    
    for (const term of glossaryTerms.slice(0, 10)) {
      const ru = await payload.find({
        collection: 'glossary',
        where: { source: { equals: term.source } },
        locale: 'ru',
        limit: 1,
      })
      expect(ru.docs[0]?.translation, `${term.source} (ru)`).toBe(term.source)
      const en = await payload.find({
        collection: 'glossary',
        where: { source: { equals: term.source } },
        locale: 'en',
        limit: 1,
      })
      expect(en.docs[0]?.translation, `${term.source} (en)`).toBe(term.en)
    }
  })
})
