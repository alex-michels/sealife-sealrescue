import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { fetchSectionOverrides, resolvedSection } from '@/site/sectionContent'
import { getSection } from '@/site/sections'

/**
 * M1-T27 (int): global `section-content` на живом Payload — access и локали.
 *  - read публичный; update — только editor/admin (у globals нет create/delete);
 *  - локали независимы: заполненный ru-override НЕ протекает в en
 *    (fetchSectionOverrides читает с fallbackLocale: false → en берётся из кода).
 */

const RUN = `m1t27-${Date.now()}`
type RoleName = 'admin' | 'editor' | 'translator' | 'viewer' | 'agent'
type TestUser = { id: number | string; email: string; role: RoleName; collection: 'users' }

let payload: Payload
const users = {} as Record<RoleName, TestUser>

async function attempt(op: () => Promise<unknown>): Promise<'allowed' | 'forbidden'> {
  try {
    await op()
    return 'allowed'
  } catch (e) {
    return (e as { name?: string }).name === 'Forbidden' ? 'forbidden' : 'allowed'
  }
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  for (const role of ['admin', 'editor', 'translator', 'viewer', 'agent'] as const) {
    const doc = await payload.create({
      collection: 'users',
      data: { email: `${RUN}-${role}@test.local`, password: `pw-${RUN}`, role },
    })
    users[role] = { id: doc.id, email: doc.email, role, collection: 'users' }
  }
}, 120_000)

afterAll(async () => {
  if (!payload) return
  // Глобал общий — возвращаем чистое состояние (delete у globals нет).
  await payload.updateGlobal({ slug: 'section-content', data: { overrides: [] } })
  await payload.delete({ collection: 'users', where: { email: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 120_000)

describe('access', () => {
  it('read — публичный (аноним читает)', async () => {
    await expect(
      attempt(() =>
        payload.findGlobal({ slug: 'section-content', overrideAccess: false, user: undefined }),
      ),
    ).resolves.toBe('allowed')
  })

  it('update — только editor/admin; агент/переводчик/viewer/аноним — нет', async () => {
    const tryUpdate = (user?: TestUser) =>
      attempt(() =>
        payload.updateGlobal({
          slug: 'section-content',
          data: { overrides: [] },
          user,
          overrideAccess: false,
        }),
      )
    await expect(tryUpdate(users.admin)).resolves.toBe('allowed')
    await expect(tryUpdate(users.editor)).resolves.toBe('allowed')
    await expect(tryUpdate(users.translator)).resolves.toBe('forbidden')
    await expect(tryUpdate(users.viewer)).resolves.toBe('forbidden')
    await expect(tryUpdate(users.agent)).resolves.toBe('forbidden')
    await expect(tryUpdate(undefined)).resolves.toBe('forbidden')
  })
})

describe('локали и fallback на код', () => {
  it('ru-override применяется на ru и НЕ протекает в en/de (там значения из кода)', async () => {
    const def = getSection('sealife', 'games')!

    await payload.updateGlobal({
      slug: 'section-content',
      locale: 'ru',
      data: {
        overrides: [{ section: 'games', title: `${RUN} Игротека`, intro: `${RUN} лид` }],
      },
    })

    const ru = await resolvedSection(def, 'ru')
    expect(ru.title.ru).toBe(`${RUN} Игротека`)
    expect(ru.intro.ru).toBe(`${RUN} лид`)

    // en: override-строка существует, но локализованные поля пусты → код, не русский текст.
    const en = await resolvedSection(def, 'en')
    expect(en.title.en).toBe(def.title.en)
    expect(en.intro.en).toBe(def.intro.en)

    const de = await resolvedSection(def, 'de')
    expect(de.title.de).toBe(def.title.de)
  })

  it('en-перевод override живёт независимо от ru', async () => {
    // Контракт локализованных массивов Payload: при записи другой локали строка
    // сопоставляется по id (без id массив пересоздаётся и ru-значения теряются —
    // тот же паттерн, что facts в seedM1).
    const current = await payload.findGlobal({ slug: 'section-content', locale: 'ru' })
    const rowId = (current.overrides ?? [])[0]?.id
    expect(rowId).toBeTruthy()

    await payload.updateGlobal({
      slug: 'section-content',
      locale: 'en',
      data: { overrides: [{ id: rowId, section: 'games', title: `${RUN} Playroom` }] },
    })

    const en = await fetchSectionOverrides('en')
    expect(en.find((r) => r.section === 'games')?.title).toBe(`${RUN} Playroom`)
    const ru = await fetchSectionOverrides('ru')
    expect(ru.find((r) => r.section === 'games')?.title).toBe(`${RUN} Игротека`)
  })
})
