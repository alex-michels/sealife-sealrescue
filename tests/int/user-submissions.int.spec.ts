import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

/**
 * QA-25 (int-слой): контракт премодерации user-submissions (EU-10/DSA, инвариант №4).
 * Форма (M2-T04) пока демо — но ПУБЛИЧНЫЙ create в коллекцию уже открыт, поэтому
 * серверный контракт закрепляем сейчас:
 *  - аноним может прислать submission БЕЗ аккаунта и email;
 *  - статус ВСЕГДА pending: попытка самоодобрения (status: approved в create)
 *    отбрасывается field-access'ом (баг найден этим тестом и закрыт);
 *  - до модерации submissions не читаются публично;
 *  - одобряет только editor.
 */

const RUN = `qa25-${Date.now()}`

let payload: Payload
let editor: { id: number | string; email: string; role: 'editor'; collection: 'users' }

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const doc = await payload.create({
    collection: 'users',
    data: { email: `${RUN}-editor@test.local`, password: `pw-${RUN}`, role: 'editor' },
  })
  editor = { id: doc.id, email: doc.email, role: 'editor', collection: 'users' }
}, 120_000)

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'user-submissions', where: { content: { like: `${RUN}` } } })
  await payload.delete({ collection: 'users', where: { email: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 120_000)

describe('премодерация user-submissions', () => {
  it('аноним отправляет без аккаунта; статус по умолчанию pending', async () => {
    const doc = await payload.create({
      collection: 'user-submissions',
      data: { submissionType: 'report', content: `${RUN} обычная заявка` } as never,
      user: undefined,
      overrideAccess: false,
    })
    expect(doc.status).toBe('pending')
  })

  it('самоодобрение невозможно: status из анонимного create отбрасывается', async () => {
    const doc = await payload.create({
      collection: 'user-submissions',
      data: {
        submissionType: 'report',
        content: `${RUN} попытка самоодобрения`,
        status: 'approved',
      } as never,
      user: undefined,
      overrideAccess: false,
    })
    expect(doc.status).toBe('pending')
  })

  it('аноним не может одобрить и через update', async () => {
    const created = await payload.create({
      collection: 'user-submissions',
      data: { submissionType: 'report', content: `${RUN} для update-попытки` } as never,
      user: undefined,
      overrideAccess: false,
    })
    await expect(
      payload.update({
        collection: 'user-submissions',
        id: created.id,
        data: { status: 'approved' } as never,
        user: undefined,
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({ name: 'Forbidden' })
  })

  it('до модерации не читается публично (Forbidden для анонима)', async () => {
    await expect(
      payload.find({ collection: 'user-submissions', overrideAccess: false, user: undefined }),
    ).rejects.toMatchObject({ name: 'Forbidden' })
  })

  it('editor одобряет (человеческая модерация работает)', async () => {
    const created = await payload.create({
      collection: 'user-submissions',
      data: { submissionType: 'report', content: `${RUN} на одобрение` } as never,
      user: undefined,
      overrideAccess: false,
    })
    const approved = await payload.update({
      collection: 'user-submissions',
      id: created.id,
      data: { status: 'approved' } as never,
      user: editor,
      overrideAccess: false,
    })
    expect(approved.status).toBe('approved')
  })
})
