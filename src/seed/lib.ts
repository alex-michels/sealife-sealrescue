import type { Payload } from 'payload'
import { contentSeed, speciesSeed, gamesSeed } from './m1SeedData'
import { glossaryTerms } from './glossaryTerms'
import { defaultLocale, targetLocales, type Locale } from '../i18n/config'

/**
 * Логика сидов, вынесенная в чистые функции (QA-18): entry-скрипты (`seedBaseline.ts` и др.,
 * запускаются через `payload run`) остаются тонкими обёртками, а идемпотентность закреплена
 * int-тестом `tests/int/seeds.int.spec.ts`, который вызывает эти функции напрямую.
 *
 * Все сиды — upsert по каноническому ключу (slug/source): повторный прогон не создаёт
 * дублей. Локализация: пишем `defaultLocale`, затем дописываем каждую из `targetLocales`
 * (непереведённые поля просто отсутствуют в переводе). Направление берётся из
 * `src/i18n/config.ts`, а не зашито литералами, — поэтому разворот ru→en (**CR-14**) сид не
 * трогает. Провенанс при этом идёт от `authoredIn` записи, а не от порядка записи.
 *
 * ⚠️ Исключение — `seedGlossary`: там ru/en остаются литералами сознательно. Глоссарий это
 * translation memory с каноническим RU-ключом (`source`), и он НЕ связан с исходной локалью
 * контента. Подробности и цена перекладки ключа — в докблоке `src/collections/Glossary.ts`.
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
 * Провенанс сида (BIO-16b/c, EU AI Act Art. 50). Флаги локализованы, поэтому у оригинала и у его
 * перевода они РАЗНЫЕ: локаль, на которой текст написан, — «черновик писал AI», остальные —
 * «машинный перевод». До BIO-16 флаг стоял ровно у одной статьи из трёх, из-за чего бейдж AI
 * висел на корректном тексте и отсутствовал у двух ошибочных.
 *
 * ⚠️ Выбор идёт по `authoredIn` записи, а НЕ по порядку записи в БД и НЕ по `defaultLocale`.
 * Это принципиально: после разворота исходной локали на en (**CR-14**) привязка к `defaultLocale`
 * пометила бы русские оригиналы «машинным переводом», а машинные переводы — «черновиком AI».
 * Читатель видит эти флаги бейджем на каждой странице — это было бы ложное заявление о
 * происхождении по AI Act Art. 50 (инвариант №5).
 *
 * Пишем и `false` тоже: сид перезаписывает сам текст, значит прежняя вычитка к нему больше
 * не относится — оставить `humanReviewed` от предыдущей версии означало бы соврать читателю.
 * `sources` и `sourceVerified` не трогаем: коллекция источников пуста, а пустая связь честнее
 * выдуманной ссылки.
 */
function provenanceFor(locale: Locale, authoredIn: Locale) {
  const original = locale === authoredIn
  return {
    aiAssisted: original,
    aiTranslated: !original,
    aiChecked: false,
    humanReviewed: false,
  }
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
    })
    const sourceData = {
      type: item.type,
      slug: item.slug,
      title: item.title[defaultLocale],
      excerpt: item.excerpt?.[defaultLocale],
      topics: item.topics,
      // Устаревший одиночный флаг — зеркалим, пока UI не переехал на группу provenance.
      aiGenerated: true,
      provenance: provenanceFor(defaultLocale, item.authoredIn),
      body: item.body ? rich(item.body[defaultLocale]) : undefined,
      _status: SEED_STATUS_CONTENT,
    }

    let id: number
    if (existing.docs[0]) {
      id = existing.docs[0].id as number
      await payload.update({ collection: 'content', id, locale: defaultLocale, data: sourceData })
      content.updated++
    } else {
      const doc = await payload.create({
        collection: 'content',
        locale: defaultLocale,
        data: sourceData,
      })
      id = doc.id as number
      content.created++
    }

    // Целевые локали: ТОЛЬКО локализованные поля — общие поля пишутся исходной локалью,
    // иначе патч перевода затрёт их.
    for (const locale of targetLocales) {
      await payload.update({
        collection: 'content',
        id,
        locale,
        data: {
          title: item.title[locale],
          excerpt: item.excerpt?.[locale],
          body: item.body ? rich(item.body[locale]) : undefined,
          provenance: provenanceFor(locale, item.authoredIn),
        },
      })
    }

  }

  const species: SeedCounts = { created: 0, updated: 0 }

  for (const sp of speciesSeed) {
    const existing = await payload.find({
      collection: 'species',
      where: { slug: { equals: sp.slug } },
      limit: 1,
    })
    const sourceData = {
      name: sp.name[defaultLocale],
      slug: sp.slug,
      latin: sp.latin,
      conservationStatus: sp.conservationStatus,
      // BIO-09/BIO-13: контекст оценки не локализуется — «оценён подвид» верно на любом языке.
      conservationAssessment: sp.conservationAssessment,
      region: sp.region?.[defaultLocale],
      size: sp.size?.[defaultLocale],
      excerpt: sp.excerpt?.[defaultLocale],
      body: sp.body ? rich(sp.body[defaultLocale]) : undefined,
      facts: sp.facts.map((f) => ({ text: f[defaultLocale] })),
      aiGenerated: true,
      provenance: provenanceFor(defaultLocale, sp.authoredIn),
      _status: SEED_STATUS_CONTENT,
    }

    let sourceDoc
    if (existing.docs[0]) {
      sourceDoc = await payload.update({
        collection: 'species',
        id: existing.docs[0].id as number,
        locale: defaultLocale,
        data: sourceData,
      })
      species.updated++
    } else {
      sourceDoc = await payload.create({
        collection: 'species',
        locale: defaultLocale,
        data: sourceData,
      })
      species.created++
    }

    // Дописываем переводы: факты сопоставляем по id, созданному при записи исходной локали —
    // иначе обновление пересоздаёт строки массива и теряет оригинал.
    const factIds = (sourceDoc.facts ?? []).map((f) => f.id)
    for (const locale of targetLocales) {
      await payload.update({
        collection: 'species',
        id: sourceDoc.id as number,
        locale,
        data: {
          name: sp.name[locale],
          region: sp.region?.[locale],
          size: sp.size?.[locale],
          excerpt: sp.excerpt?.[locale],
          body: sp.body ? rich(sp.body[locale]) : undefined,
          facts: sp.facts.map((f, i) => ({ id: factIds[i], text: f[locale] })),
          provenance: provenanceFor(locale, sp.authoredIn),
        },
      })
    }

  }

  const games = await seedGames(payload)

  return { content, species, games }
}
