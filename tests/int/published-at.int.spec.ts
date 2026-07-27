import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { defaultLocale } from '@/i18n/config'

/**
 * **CR-05** на живом Payload: штамп даты выхода и порядок списков.
 *
 * Unit-тест закрывает правило; здесь проверяется, что хук реально включён в `Content` и что
 * сортировка `-publishedAt` даёт тот порядок, ради которого задача и делалась.
 */

const RUN = `cr05-${Date.now()}`

describe('CR-05: дата публикации', () => {
  let payload: Payload

  const mk = (n: number, status: 'draft' | 'published') =>
    payload.create({
      collection: 'content',
      locale: defaultLocale,
      data: { type: 'article', slug: `${RUN}-${n}`, title: `${RUN} #${n}`, _status: status },
    })

  beforeAll(async () => {
    payload = await getPayload({ config })
  }, 120_000)

  afterAll(async () => {
    await payload.delete({ collection: 'content', where: { slug: { like: RUN } } }).catch(() => {})
    await payload.db.destroy?.()
  }, 120_000)

  it('публикация ставит publishedAt; черновик остаётся без даты', async () => {
    const published = await mk(1, 'published')
    const draft = await mk(2, 'draft')

    expect(published.publishedAt, 'опубликованный получил дату').toBeTruthy()
    expect(draft.publishedAt, 'черновик без даты').toBeFalsy()
  }, 120_000)

  it('правка опубликованного НЕ двигает дату выхода — суть задачи', async () => {
    const doc = await mk(3, 'published')
    const stamped = doc.publishedAt

    // Имитируем «исправил опечатку через месяц».
    const edited = await payload.update({
      collection: 'content',
      id: doc.id,
      locale: defaultLocale,
      data: { title: `${RUN} #3 (исправлено)` },
    })

    expect(edited.publishedAt).toBe(stamped)
    expect(new Date(edited.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(stamped as string).getTime(),
    )
  }, 120_000)

  it('вручную выставленная дата сохраняется', async () => {
    const manual = '2026-03-01T08:00:00.000Z'
    const doc = await payload.create({
      collection: 'content',
      locale: defaultLocale,
      data: {
        type: 'article',
        slug: `${RUN}-4`,
        title: `${RUN} #4`,
        _status: 'published',
        publishedAt: manual,
      },
    })
    expect(new Date(doc.publishedAt as string).toISOString()).toBe(manual)
  }, 120_000)

  it('сортировка -publishedAt: свежая публикация выше старой, правка порядок не меняет', async () => {
    const old = await payload.create({
      collection: 'content',
      locale: defaultLocale,
      data: {
        type: 'article',
        slug: `${RUN}-old`,
        title: `${RUN} старая`,
        _status: 'published',
        publishedAt: '2026-01-01T00:00:00.000Z',
      },
    })
    const fresh = await payload.create({
      collection: 'content',
      locale: defaultLocale,
      data: {
        type: 'article',
        slug: `${RUN}-fresh`,
        title: `${RUN} свежая`,
        _status: 'published',
        publishedAt: '2026-06-01T00:00:00.000Z',
      },
    })

    const order = async () => {
      const { docs } = await payload.find({
        collection: 'content',
        locale: defaultLocale,
        fallbackLocale: false,
        where: { slug: { in: [`${RUN}-old`, `${RUN}-fresh`] } },
        sort: '-publishedAt',
        depth: 0,
      })
      return docs.map((d) => d.slug)
    }

    expect(await order()).toEqual([`${RUN}-fresh`, `${RUN}-old`])

    // Трогаем СТАРУЮ запись — до CR-05 она бы всплыла наверх.
    await payload.update({
      collection: 'content',
      id: old.id,
      locale: defaultLocale,
      data: { title: `${RUN} старая (правка)` },
    })
    expect(await order(), 'правка старой записи не поднимает её').toEqual([
      `${RUN}-fresh`,
      `${RUN}-old`,
    ])
    expect(fresh.publishedAt).toBeTruthy()
  }, 120_000)

  it('инвариант: опубликованной записи без даты выхода не существует', async () => {
    // Она уехала бы в НАЧАЛО списков — Postgres при `-publishedAt` ставит NULL первым.
    const doc = await mk(5, 'published')
    const cleared = await payload.update({
      collection: 'content',
      id: doc.id,
      locale: defaultLocale,
      data: { publishedAt: null },
    })
    expect(cleared.publishedAt, 'очистка даты у опубликованного восстанавливается').toBeTruthy()
  }, 120_000)
})
