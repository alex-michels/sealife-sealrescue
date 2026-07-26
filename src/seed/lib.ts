import type { Payload } from 'payload'
import { contentSeed, speciesSeed, gamesSeed } from './m1SeedData'
import { glossaryTerms } from './glossaryTerms'

/**
 * Логика сидов, вынесенная в чистые функции (QA-18): entry-скрипты (`seedBaseline.ts` и др.,
 * запускаются через `payload run`) остаются тонкими обёртками, а идемпотентность закреплена
 * int-тестом `tests/int/seeds.int.spec.ts`, который вызывает эти функции напрямую.
 *
 * Все сиды — upsert по каноническому ключу (slug/source): повторный прогон не создаёт
 * дублей. Локализация: пишем исходную локаль ru, затем дописываем перевод en
 * (непереведённые поля просто отсутствуют в en).
 */

export type SeedCounts = { created: number; updated: number }

/**
 * BIO-16: сид — это AI-черновик, а не публикация.
 *
 * `content` и `species` сеются со статусом `draft`. Раньше они писались как `published`, то
 * есть непроверенная биология сразу становилась опубликованным контентом (и заодно
 * few-shot-образцом для агента M2-T06) — ровно то, что запрещает инвариант №7. Публичные
 * запросы фильтруют `_status: 'published'`, поэтому после этой правки демо-записи видны в
 * админке и не видны на сайте, пока человек их не опубликует.
 *
 * ⚠️ `games` остаются `published` СОЗНАТЕЛЬНО: лидерборд резолвит игру по slug, и черновик
 * вернул бы `unknown_game`. `seedBaseline` — bootstrap-минимум любой свежей БД.
 */
const SEED_STATUS_CONTENT = 'draft' as const

/**
 * Провенанс сида (BIO-16b/c, EU AI Act Art. 50). Флаги локализованы, поэтому у исходного
 * русского текста и его английского перевода они РАЗНЫЕ: ru — черновик писал AI, en —
 * машинный перевод. До этой правки флаг стоял ровно у одной статьи из трёх, из-за чего
 * бейдж AI висел на корректном тексте и отсутствовал у двух ошибочных.
 *
 * Пишем и `false` тоже: сид перезаписывает сам текст, значит прежняя вычитка к нему больше
 * не относится — оставить `humanReviewed` от предыдущей версии означало бы соврать читателю.
 * `sources` и `sourceVerified` не трогаем: коллекция источников пуста, а пустая связь честнее
 * выдуманной ссылки.
 */
const provenanceSource = {
  aiAssisted: true,
  aiTranslated: false,
  aiChecked: false,
  humanReviewed: false,
}
const provenanceTranslation = {
  aiAssisted: false,
  aiTranslated: true,
  aiChecked: false,
  humanReviewed: false,
}

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

/**
 * SH-14: выставить standalone-заглушку «Coming soon» для игры (kill-switch альфы).
 * НЕ сид (сиды это поле сознательно не трогают — админ-выбор не перетирается);
 * используется entry-скриптом `toggleStandalone.ts` / workflow «Toggle game standalone»,
 * когда админка недоступна (alpha-прокси пропускает только игровые endpoints).
 * Пишет published-версию: эндпоинт /api/game-config читает draft: false.
 */
export async function setGameStandaloneComingSoon(
  payload: Payload,
  slug: string,
  comingSoon: boolean,
): Promise<boolean> {
  const res = await payload.find({
    collection: 'games',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const doc = res.docs[0]
  if (!doc) return false
  await payload.update({
    collection: 'games',
    id: doc.id,
    data: { standaloneComingSoon: comingSoon, _status: 'published' },
  })
  return true
}

/** Games — общий для baseline и m1 (единственный MUST-HAVE лидерборда: unknown_game без него). */
export async function seedGames(payload: Payload): Promise<SeedCounts> {
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

    // en-перевод (локализованные поля), без перезаписи ru.
    await payload.update({
      collection: 'games',
      id,
      locale: 'en',
      data: { title: g.title.en, excerpt: g.excerpt?.en, how: g.how?.en },
    })
  }

  return { created, updated }
}

/** Baseline — MUST-HAVE записи любой свежей БД (сейчас: games). */
export async function seedBaseline(payload: Payload): Promise<{ games: SeedCounts }> {
  return { games: await seedGames(payload) }
}

/** Глоссарий / translation memory. source — общий ключ; ru+en. */
export async function seedGlossary(payload: Payload): Promise<SeedCounts> {
  let created = 0
  let updated = 0

  for (const term of glossaryTerms) {
    // Нелокализованные поля (общие для всех локалей).
    const shared = {
      source: term.source,
      category: term.category,
      doNotTranslate: term.doNotTranslate ?? false,
    }
    // Варианты локализованы — свой список на каждую локаль.
    const ruVariants = (term.variants?.ru ?? []).map((v) => ({
      value: v.value,
      category: v.category,
    }))
    const enVariants = (term.variants?.en ?? []).map((v) => ({
      value: v.value,
      category: v.category,
    }))

    const existing = await payload.find({
      collection: 'glossary',
      where: { source: { equals: term.source } },
      limit: 1,
    })

    const id = existing.docs[0]?.id

    if (id) {
      // Исходная локаль: общие поля + ru-заметка + ru-эквивалент + ru-варианты.
      await payload.update({
        collection: 'glossary',
        id,
        locale: 'ru',
        data: { ...shared, translation: term.source, note: term.note, variants: ruVariants },
      })
      // Целевая локаль: перевод + en-варианты.
      await payload.update({
        collection: 'glossary',
        id,
        locale: 'en',
        data: { translation: term.en, variants: enVariants },
      })
      updated++
    } else {
      const doc = await payload.create({
        collection: 'glossary',
        locale: 'ru',
        data: { ...shared, translation: term.source, note: term.note, variants: ruVariants },
      })
      await payload.update({
        collection: 'glossary',
        id: doc.id,
        locale: 'en',
        data: { translation: term.en, variants: enVariants },
      })
      created++
    }
  }

  return { created, updated }
}

/**
 * Демо-контент M1: Content + Species + Games, RU/EN.
 * Content и Species — ЧЕРНОВИКИ (BIO-16), games — published (иначе лидерборд не резолвит slug).
 */
export async function seedM1(
  payload: Payload,
): Promise<{ content: SeedCounts; species: SeedCounts; games: SeedCounts }> {
  const content: SeedCounts = { created: 0, updated: 0 }

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
      // Устаревший одиночный флаг — зеркалим, пока UI не переехал на группу provenance.
      aiGenerated: true,
      provenance: provenanceSource,
      body: item.body ? rich(item.body.ru) : undefined,
      _status: SEED_STATUS_CONTENT,
    }

    let id: number
    if (existing.docs[0]) {
      id = existing.docs[0].id as number
      await payload.update({ collection: 'content', id, locale: 'ru', data: ruData })
      content.updated++
    } else {
      const doc = await payload.create({ collection: 'content', locale: 'ru', data: ruData })
      id = doc.id as number
      content.created++
    }

    await payload.update({
      collection: 'content',
      id,
      locale: 'en',
      data: {
        title: item.title.en,
        excerpt: item.excerpt?.en,
        body: item.body ? rich(item.body.en) : undefined,
        provenance: provenanceTranslation,
      },
    })

  }

  const species: SeedCounts = { created: 0, updated: 0 }

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
      // BIO-09/BIO-13: контекст оценки не локализуется — «оценён подвид» верно на любом языке.
      conservationAssessment: sp.conservationAssessment,
      region: sp.region?.ru,
      size: sp.size?.ru,
      excerpt: sp.excerpt?.ru,
      body: sp.body ? rich(sp.body.ru) : undefined,
      facts: sp.facts.map((f) => ({ text: f.ru })),
      aiGenerated: true,
      provenance: provenanceSource,
      _status: SEED_STATUS_CONTENT,
    }

    let ruDoc
    if (existing.docs[0]) {
      ruDoc = await payload.update({
        collection: 'species',
        id: existing.docs[0].id as number,
        locale: 'ru',
        data: ruData,
      })
      species.updated++
    } else {
      ruDoc = await payload.create({ collection: 'species', locale: 'ru', data: ruData })
      species.created++
    }

    // Дописываем en: сопоставляем факты по id, созданному при записи ru —
    // иначе обновление en пересоздаёт строки массива и теряет ru.
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
        provenance: provenanceTranslation,
      },
    })

  }

  const games = await seedGames(payload)

  return { content, species, games }
}
