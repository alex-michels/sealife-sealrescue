import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { defaultLocale } from '@/i18n/config'
import { feedTypes } from '@/content/contentTypes'
import { translatedWhere } from '@/i18n/translated'

/**
 * **CR-06** на живом Payload: запрос ленты не отдаёт служебные страницы.
 *
 * Unit-тест закрывает таблицу типов; здесь проверяется, что фильтр реально применяется — иначе
 * таблица была бы правильной и неиспользованной.
 */

const RUN = `cr06-${Date.now()}`

describe('CR-06: лента главной', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config })
    for (const [n, type] of [
      [1, 'article'],
      [2, 'page'],
    ] as const) {
      await payload.create({
        collection: 'content',
        locale: defaultLocale,
        data: { type, slug: `${RUN}-${n}`, title: `${RUN} ${type}`, _status: 'published' },
      })
    }
  }, 240_000)

  afterAll(async () => {
    await payload.delete({ collection: 'content', where: { slug: { like: RUN } } }).catch(() => {})
    await payload.db.destroy?.()
  }, 120_000)

  it('запрос ленты берёт статью и НЕ берёт служебную страницу', async () => {
    // Тот же where, что и в LatestFeed.
    const { docs } = await payload.find({
      collection: 'content',
      locale: defaultLocale,
      fallbackLocale: false,
      where: {
        and: [
          { _status: { equals: 'published' }, type: { in: feedTypes } },
          translatedWhere('title'),
          { slug: { like: RUN } },
        ],
      },
      depth: 0,
    })

    const slugs = docs.map((d) => d.slug)
    expect(slugs).toContain(`${RUN}-1`)
    expect(slugs, 'служебная страница в ленте не нужна').not.toContain(`${RUN}-2`)
  }, 120_000)

  it('без фильтра типов страница попала бы в ленту — фиксируем сам баг', async () => {
    const { docs } = await payload.find({
      collection: 'content',
      locale: defaultLocale,
      fallbackLocale: false,
      where: { and: [{ _status: { equals: 'published' } }, { slug: { like: RUN } }] },
      depth: 0,
    })
    expect(docs.map((d) => d.slug)).toContain(`${RUN}-2`)
  }, 120_000)
})
