import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { seedM1 } from '@/seed/lib'
import { contentSeed } from '@/seed/m1SeedData'
import { defaultLocale } from '@/i18n/config'

/**
 * **CR-03** на живом Payload: повторный прогон сида НЕ уничтожает работу человека.
 *
 * Самый дорогой сценарий проекта: владелец пишет настоящую статью под одним из 12 занятых
 * slug'ов, кто-то запускает `npm run seed:m1` — и текст заменён, публикация снята, авторство
 * переписано на AI. Без единой ошибки в логе.
 */

describe('CR-03: сид не затирает работу человека', () => {
  let payload: Payload
  const victim = contentSeed[0]

  beforeAll(async () => {
    payload = await getPayload({ config })
    await seedM1(payload) // приводим БД к посеянному состоянию
  }, 240_000)

  afterAll(async () => {
    // Возвращаем демо-запись к эталону, чтобы не ломать соседние спеки.
    await seedM1(payload, { force: true })
    await payload.db.destroy?.()
  }, 240_000)

  const read = async () => {
    const { docs } = await payload.find({
      collection: 'content',
      where: { slug: { equals: victim.slug } },
      locale: defaultLocale,
      fallbackLocale: false,
      limit: 1,
    })
    return docs[0]
  }

  it('опубликованная человеком запись переживает повторный сид', async () => {
    const before = await read()
    await payload.update({
      collection: 'content',
      id: before.id,
      locale: defaultLocale,
      data: { title: 'Настоящая статья владельца', _status: 'published' },
    })

    const res = await seedM1(payload)
    expect(res.content.skipped, 'сид должен сообщить о пропуске').toBeGreaterThan(0)

    const after = await read()
    expect(after.title, 'заголовок не тронут').toBe('Настоящая статья владельца')
    expect(after._status, 'публикация не снята').toBe('published')
  }, 240_000)

  it('force осознанно возвращает демо-эталон', async () => {
    await seedM1(payload, { force: true })
    const after = await read()
    expect(after.title).toBe(victim.title[defaultLocale])
    expect(after._status).toBe('draft')
  }, 240_000)
})
