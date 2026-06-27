/**
 * Идемпотентный посев демо-контента M1 (Content + Species), RU/EN. Запуск: pnpm seed:m1
 *
 * Top-level await (НЕ floating promise): `payload run` делает await import + сразу
 * process.exit, плавающий промис не успел бы записать в БД (см. seedGlossary).
 *
 * Локализация как в глоссарии: создаём/обновляем исходную локаль ru, затем дописываем en.
 * Для localized-полей внутри массива (Species.facts) сопоставляем строки по id, иначе
 * обновление en пересоздаёт строки и теряет ru.
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { contentSeed, speciesSeed, gamesSeed } from './m1SeedData'

const payload = await getPayload({ config })

/** Минимальный lexical-документ из абзацев. */
function rich(paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [
          { type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 },
        ],
      })),
    },
  }
}

let contentCreated = 0
let contentUpdated = 0

for (const item of contentSeed) {
  const existing = await payload.find({
    collection: 'content',
    where: { slug: { equals: item.slug } },
    limit: 1,
    locale: 'ru',
  })
  const ruData = {
    type: item.type,
    slug: item.slug,
    title: item.title.ru,
    excerpt: item.excerpt?.ru,
    topics: item.topics,
    aiGenerated: item.aiGenerated ?? false,
    body: item.body ? rich(item.body.ru) : undefined,
    _status: 'published' as const,
  }

  let id: number
  if (existing.docs[0]) {
    id = existing.docs[0].id as number
    await payload.update({ collection: 'content', id, locale: 'ru', data: ruData })
    contentUpdated++
  } else {
    const doc = await payload.create({ collection: 'content', locale: 'ru', data: ruData })
    id = doc.id as number
    contentCreated++
  }

  await payload.update({
    collection: 'content',
    id,
    locale: 'en',
    data: {
      title: item.title.en,
      excerpt: item.excerpt?.en,
      body: item.body ? rich(item.body.en) : undefined,
    },
  })
}

let speciesCreated = 0
let speciesUpdated = 0

for (const sp of speciesSeed) {
  const existing = await payload.find({
    collection: 'species',
    where: { slug: { equals: sp.slug } },
    limit: 1,
    locale: 'ru',
  })
  const ruData = {
    name: sp.name.ru,
    slug: sp.slug,
    latin: sp.latin,
    conservationStatus: sp.conservationStatus,
    region: sp.region?.ru,
    size: sp.size?.ru,
    excerpt: sp.excerpt?.ru,
    body: sp.body ? rich(sp.body.ru) : undefined,
    facts: sp.facts.map((f) => ({ text: f.ru })),
    aiGenerated: sp.aiGenerated ?? false,
    _status: 'published' as const,
  }

  let ruDoc
  if (existing.docs[0]) {
    ruDoc = await payload.update({
      collection: 'species',
      id: existing.docs[0].id as number,
      locale: 'ru',
      data: ruData,
    })
    speciesUpdated++
  } else {
    ruDoc = await payload.create({ collection: 'species', locale: 'ru', data: ruData })
    speciesCreated++
  }

  // Дописываем en: сопоставляем факты по id, созданному при записи ru.
  const factIds = (ruDoc.facts ?? []).map((f) => f.id)
  await payload.update({
    collection: 'species',
    id: ruDoc.id as number,
    locale: 'en',
    data: {
      name: sp.name.en,
      region: sp.region?.en,
      size: sp.size?.en,
      excerpt: sp.excerpt?.en,
      body: sp.body ? rich(sp.body.en) : undefined,
      facts: sp.facts.map((f, i) => ({ id: factIds[i], text: f.en })),
    },
  })
}

let gamesCreated = 0
let gamesUpdated = 0

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
    gamesUpdated++
  } else {
    const doc = await payload.create({ collection: 'games', locale: 'ru', data: ruData })
    id = doc.id as number
    gamesCreated++
  }

  // Дописываем перевод en (локализованные поля), не трогая ru.
  await payload.update({
    collection: 'games',
    id,
    locale: 'en',
    data: {
      title: g.title.en,
      excerpt: g.excerpt?.en,
      how: g.how?.en,
    },
  })
}

console.log(
  `M1 seed: content +${contentCreated}/~${contentUpdated}, species +${speciesCreated}/~${speciesUpdated}, games +${gamesCreated}/~${gamesUpdated}.`,
)
