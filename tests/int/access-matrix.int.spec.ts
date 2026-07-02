import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

/**
 * QA-13: access-матрица ВСЕХ коллекций — параметризованный int-тест.
 * Ожидания — из docs/data-model.md § «Матрица доступа» (и access-функций src/access/roles.ts).
 * Инварианты №1–2 CLAUDE.md (агент НИКОГДА не публикует и не удаляет) — отдельные ассерты.
 *
 * Техника: операции гоняются через Payload local API с `overrideAccess: false` и реальным
 * пользователем нужной роли. Для create/update/delete фикстуры не нужны:
 *   - Forbidden  → доступ ЗАПРЕЩЁН (access-проверка идёт первой);
 *   - ValidationError (create с пустыми data) / NotFound (update/delete по id=0) →
 *     доступ РАЗРЕШЁН — операция прошла access и упала позже по данным.
 * Фикстуры нужны только для read-фильтра черновиков (readPublishedOrStaff) и хука
 * forceAgentDrafts — они создаются на `content` и чистятся в afterAll.
 */

type RoleName = 'admin' | 'editor' | 'translator' | 'viewer' | 'agent'
type Actor = RoleName | 'anon'
type TestUser = { id: number | string; email: string; role: RoleName; collection: 'users' }

const ROLES: RoleName[] = ['admin', 'editor', 'translator', 'viewer', 'agent']
const ACTORS: Actor[] = ['anon', ...ROLES]

// Уникальный суффикс прогона: параллельные/повторные запуски не конфликтуют,
// cleanup находит только своё.
const RUN = `qa13-${Date.now()}`

const EDITORS: Actor[] = ['admin', 'editor']
const STAFF: Actor[] = [...EDITORS, 'translator']
const CONTENT_CREATORS: Actor[] = [...EDITORS, 'agent'] // черновики — да, публикация — нет
const CONTENT_UPDATERS: Actor[] = [...STAFF, 'agent']
const ADMIN_ONLY: Actor[] = ['admin']
const EVERYONE: Actor[] = [...ACTORS]

/** Ожидаемая матрица create/update/delete (docs/data-model.md). */
const MATRIX: Record<string, { create: Actor[]; update: Actor[]; delete: Actor[] }> = {
  content: { create: CONTENT_CREATORS, update: CONTENT_UPDATERS, delete: EDITORS },
  species: { create: CONTENT_CREATORS, update: CONTENT_UPDATERS, delete: EDITORS },
  quizzes: { create: CONTENT_CREATORS, update: CONTENT_UPDATERS, delete: EDITORS },
  games: { create: CONTENT_CREATORS, update: CONTENT_UPDATERS, delete: EDITORS },
  'rescue-centers': { create: EDITORS, update: EDITORS, delete: EDITORS },
  media: { create: EDITORS, update: EDITORS, delete: EDITORS }, // SEC-07: явный access
  glossary: { create: STAFF, update: STAFF, delete: EDITORS },
  sources: { create: CONTENT_CREATORS, update: CONTENT_UPDATERS, delete: EDITORS },
  'user-submissions': { create: EVERYONE, update: EDITORS, delete: EDITORS },
  'game-scores': { create: EDITORS, update: EDITORS, delete: EDITORS },
  'agent-proposals': { create: CONTENT_CREATORS, update: EDITORS, delete: EDITORS },
  'agent-runs': { create: CONTENT_CREATORS, update: CONTENT_UPDATERS, delete: EDITORS },
  reactions: { create: EDITORS, update: EDITORS, delete: EDITORS },
  users: { create: ADMIN_ONLY, update: ADMIN_ONLY, delete: ADMIN_ONLY },
}

/** Ожидаемый boolean-read (query-фильтры content-семейства и users — отдельными тестами). */
const READ: Record<string, Actor[]> = {
  'rescue-centers': EVERYONE,
  glossary: EVERYONE,
  'game-scores': EVERYONE,
  reactions: EVERYONE,
  media: EVERYONE,
  sources: ROLES, // isLoggedIn
  'agent-proposals': ROLES,
  'agent-runs': ROLES,
  'user-submissions': EDITORS,
}

let payload: Payload
const users = {} as Record<RoleName, TestUser>
let publishedId: number | string
let draftId: number | string
let agentTargetId: number | string

async function attempt(op: () => Promise<unknown>): Promise<'allowed' | 'forbidden'> {
  try {
    await op()
    return 'allowed'
  } catch (e) {
    return (e as { name?: string }).name === 'Forbidden' ? 'forbidden' : 'allowed'
  }
}

const userFor = (actor: Actor): TestUser | undefined =>
  actor === 'anon' ? undefined : users[actor]

beforeAll(async () => {
  payload = await getPayload({ config: await config })

  for (const role of ROLES) {
    const doc = await payload.create({
      collection: 'users',
      data: { email: `${RUN}-${role}@test.local`, password: `pw-${RUN}`, role },
    })
    users[role] = { id: doc.id, email: doc.email, role, collection: 'users' }
  }

  // Фикстуры для read-фильтра черновиков + хука forceAgentDrafts.
  const published = await payload.create({
    collection: 'content',
    data: { type: 'article', title: `${RUN} published`, slug: `${RUN}-published`, _status: 'published' },
  })
  publishedId = published.id
  const draft = await payload.create({
    collection: 'content',
    data: { type: 'article', title: `${RUN} draft`, slug: `${RUN}-draft`, _status: 'draft' },
  })
  draftId = draft.id
  const agentTarget = await payload.create({
    collection: 'content',
    data: { type: 'article', title: `${RUN} agent target`, slug: `${RUN}-agent-target`, _status: 'published' },
  })
  agentTargetId = agentTarget.id
}, 120_000)

afterAll(async () => {
  if (!payload) return // beforeAll не добежал — чистить нечего
  await payload.delete({ collection: 'content', where: { slug: { like: `${RUN}-` } } })
  await payload.delete({ collection: 'users', where: { email: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 120_000)

describe('матрица create/update/delete (все коллекции × все роли)', () => {
  for (const [collection, ops] of Object.entries(MATRIX)) {
    for (const actor of ACTORS) {
      const c = ops.create.includes(actor) ? 'allowed' : 'forbidden'
      const u = ops.update.includes(actor) ? 'allowed' : 'forbidden'
      const d = ops.delete.includes(actor) ? 'allowed' : 'forbidden'

      it(`${collection} × ${actor}: create=${c} update=${u} delete=${d}`, async () => {
        await expect(
          attempt(() =>
            payload.create({
              collection: collection as never,
              data: {} as never,
              user: userFor(actor),
              overrideAccess: false,
            }),
          ),
        ).resolves.toBe(c)

        await expect(
          attempt(() =>
            payload.update({
              collection: collection as never,
              id: 999999999,
              data: {} as never,
              user: userFor(actor),
              overrideAccess: false,
            }),
          ),
        ).resolves.toBe(u)

        await expect(
          attempt(() =>
            payload.delete({
              collection: collection as never,
              id: 999999999,
              user: userFor(actor),
              overrideAccess: false,
            }),
          ),
        ).resolves.toBe(d)
      })
    }
  }
})

describe('boolean-read', () => {
  for (const [collection, allowed] of Object.entries(READ)) {
    it(`${collection}: читают только [${allowed.join(', ')}]`, async () => {
      for (const actor of ACTORS) {
        const expected = allowed.includes(actor) ? 'allowed' : 'forbidden'
        await expect(
          attempt(() =>
            payload.find({
              collection: collection as never,
              limit: 1,
              user: userFor(actor),
              overrideAccess: false,
            }),
          ),
          `${collection} × ${actor}`,
        ).resolves.toBe(expected)
      }
    })
  }
})

describe('read черновиков (readPublishedOrStaff, content-семейство)', () => {
  it('аноним видит только published', async () => {
    const res = await payload.find({
      collection: 'content',
      where: { slug: { like: `${RUN}-` } },
      overrideAccess: false,
      user: undefined,
    })
    const slugs = res.docs.map((doc) => doc.slug)
    expect(slugs).toContain(`${RUN}-published`)
    expect(slugs).not.toContain(`${RUN}-draft`)
  })

  for (const role of ROLES) {
    it(`${role} видит и черновики`, async () => {
      const res = await payload.find({
        collection: 'content',
        where: { slug: { like: `${RUN}-` } },
        user: users[role],
        overrideAccess: false,
      })
      expect(res.docs.map((doc) => doc.slug)).toContain(`${RUN}-draft`)
    })
  }
})

describe('users: least-privilege read', () => {
  it('admin видит все аккаунты', async () => {
    const res = await payload.find({
      collection: 'users',
      where: { email: { like: `${RUN}-` } },
      user: users.admin,
      overrideAccess: false,
    })
    expect(res.totalDocs).toBe(ROLES.length)
  })

  for (const role of ROLES.filter((r) => r !== 'admin')) {
    it(`${role} видит только себя`, async () => {
      const res = await payload.find({
        collection: 'users',
        user: users[role],
        overrideAccess: false,
      })
      expect(res.docs.map((doc) => doc.email)).toEqual([users[role].email])
    })
  }

  it('аноним не читает users вовсе', async () => {
    await expect(
      attempt(() => payload.find({ collection: 'users', overrideAccess: false, user: undefined })),
    ).resolves.toBe('forbidden')
  })
})

describe('инварианты №1–2 CLAUDE.md: агент никогда не публикует и не удаляет', () => {
  it('в ожидаемой матрице delete нигде не содержит agent (и anon)', () => {
    for (const [collection, ops] of Object.entries(MATRIX)) {
      expect(ops.delete, `${collection}.delete`).not.toContain('agent')
      expect(ops.delete, `${collection}.delete`).not.toContain('anon')
    }
  })

  it('forceAgentDrafts: create агентом с _status=published сохраняется как draft', async () => {
    const doc = await payload.create({
      collection: 'content',
      data: {
        type: 'article',
        title: `${RUN} agent create`,
        slug: `${RUN}-agent-create`,
        _status: 'published',
      } as never,
      user: users.agent,
      overrideAccess: false,
    })
    expect(doc._status).toBe('draft')
  })

  it('forceAgentDrafts: update агентом published-документа не публикует (остаётся draft)', async () => {
    const doc = await payload.update({
      collection: 'content',
      id: agentTargetId,
      data: { title: `${RUN} agent touched`, _status: 'published' } as never,
      user: users.agent,
      overrideAccess: false,
    })
    expect(doc._status).toBe('draft')
  })

  it('контроль: editor МОЖЕТ публиковать', async () => {
    const doc = await payload.update({
      collection: 'content',
      id: draftId,
      data: { _status: 'published' } as never,
      user: users.editor,
      overrideAccess: false,
    })
    expect(doc._status).toBe('published')
  })
})
