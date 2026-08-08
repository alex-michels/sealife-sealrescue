import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { defaultLocale, targetLocales } from '@/i18n/config'
import { dailyPool, latestOfType } from '@/app/(frontend)/_components/content/getContent'
import { featuredGame } from '@/app/(frontend)/_components/content/getGames'

/**
 * **M1-T05** (int-слой): запросы плиток bento на живом Payload.
 *
 * Проверяется не вёрстка, а три правила, каждое из которых уже один раз стоило проекту бага:
 *  - пул «X дня» берётся ПОЛНОСТЬЮ, а не страницей (иначе «мем дня» = «мем первой страницы» —
 *    ровно ошибка, которую поймал CR-07 на «факте дня»);
 *  - «последняя новость» сортируется по дате ВЫХОДА, а не по последней правке (CR-05);
 *  - непереведённый и неопубликованный документ в плитку не попадает (CR-01 + инвариант №1).
 */

const RUN = `m1t05-${Date.now()}`
const target = targetLocales[0]

let payload: Payload

const lex = (text: string) => ({
  root: {
    type: 'root',
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] }],
    direction: null,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

const mkMeme = async (slug: string, title: string, status: 'draft' | 'published') =>
  payload.create({
    collection: 'content',
    locale: defaultLocale,
    data: { type: 'meme', title, slug: `${RUN}-${slug}`, body: lex('body'), _status: status },
  })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'content', where: { slug: { like: `${RUN}-` } } })
}, 180_000)

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'content', where: { slug: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 180_000)

const ours = <T extends { slug?: string | null }>(docs: T[]) =>
  docs.filter((d) => d.slug?.startsWith(RUN))

describe('dailyPool (пул «X дня»)', () => {
  it('отдаёт опубликованное и НЕ отдаёт черновик', async () => {
    // Инвариант №1: публикация — человеческое действие. Сиды пишут контент черновиками (BIO-16),
    // поэтому «плитка пуста» — это нормальный режим, а не повод ослабить фильтр.
    await mkMeme('pub', `${RUN} published meme`, 'published')
    await mkMeme('draft', `${RUN} draft meme`, 'draft')

    const pool = ours(await dailyPool('meme', defaultLocale))
    expect(pool.map((d) => d.slug)).toEqual([`${RUN}-pub`])
  })

  it('НЕ страница, а весь пул: больше PER_PAGE документов приходят целиком', async () => {
    // Ключевая проверка: pickOfDay берёт день % длину пула. Обрезанный до PER_PAGE=12 пул
    // превратил бы «мем дня» в «мем первой страницы».
    for (let i = 0; i < 14; i++) await mkMeme(`bulk-${i}`, `${RUN} bulk ${i}`, 'published')
    const pool = ours(await dailyPool('meme', defaultLocale))
    expect(pool.length).toBeGreaterThan(12)
  })

  it('непереведённый документ не попадает в чужую локаль (CR-01)', async () => {
    const pool = ours(await dailyPool('meme', target))
    expect(pool).toEqual([])
  })
})

describe('latestOfType (последняя новость)', () => {
  it('берёт свежайшую по дате ВЫХОДА, а не по последней правке (CR-05)', async () => {
    const older = await payload.create({
      collection: 'content',
      locale: defaultLocale,
      data: {
        type: 'news',
        title: `${RUN} old news`,
        slug: `${RUN}-news-old`,
        publishedAt: '2020-01-01T00:00:00.000Z',
        _status: 'published',
      },
    })
    await payload.create({
      collection: 'content',
      locale: defaultLocale,
      data: {
        type: 'news',
        title: `${RUN} new news`,
        slug: `${RUN}-news-new`,
        publishedAt: '2026-01-01T00:00:00.000Z',
        _status: 'published',
      },
    })

    // Правим СТАРЫЙ материал: updatedAt у него теперь новее, publishedAt — нет.
    await payload.update({
      collection: 'content',
      id: older.id,
      locale: defaultLocale,
      data: { excerpt: 'исправили опечатку' },
    })

    const latest = await latestOfType('news', defaultLocale)
    expect(latest?.slug).toBe(`${RUN}-news-new`)
  })

  it('нет подходящих документов — null, а не выдумка', async () => {
    expect(await latestOfType('news', target)).toBeNull()
  })
})

describe('featuredGame (плитка «во что поиграть»)', () => {
  it('первая по редакторскому порядку order, а не случайная', async () => {
    const game = await featuredGame(defaultLocale)
    // Игры — единственная коллекция, которую сид публикует сознательно (иначе лидерборд вернёт
    // unknown_game), поэтому на посеянной БД плитка наполнена.
    if (!game) return
    const { docs } = await payload.find({
      collection: 'games',
      locale: defaultLocale,
      fallbackLocale: false,
      where: { _status: { equals: 'published' } },
      sort: 'order',
      limit: 1,
      depth: 0,
    })
    expect(game.slug).toBe(docs[0]?.slug)
  })
})
