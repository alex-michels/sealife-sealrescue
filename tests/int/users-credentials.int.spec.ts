// @vitest-environment node
// Вход подписывает JWT через `jose`, а тот в jsdom падает («payload must be an instance of
// Uint8Array»: TextEncoder jsdom отдаёт Uint8Array из другого realm) — артефакт среды, как в
// media-upload.int.spec.ts. Здесь проверяется именно успешный вход, поэтому — настоящий Node.
import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import type { User } from '@/payload-types'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

/**
 * Учётные данные staff после апгрейда Payload 3.85 → 3.90 (SEC-09).
 *
 * 1. **Пароли.** До 3.90 Payload хешировал PBKDF2-SHA256 с 25 000 итераций и ключом 512 байт
 *    (GHSA-q6mq-ch85-c8mm, «insufficient PBKDF2 iterations»). 3.90 пишет новые хеши с префиксом
 *    `pbkdf2-sha256-v1:` (600 000 итераций, 32 байта), а старые продолжает проверять и
 *    перехеширует после успешного входа. Живые хеши в проде — старого формата: если бы проверка
 *    старых сломалась, staff потерял бы вход в админку. Поэтому хеш здесь кладётся в БД мимо
 *    Payload ровно тем алгоритмом, которым его писала 3.85.
 * 2. **API-ключи агентов.** 3.90 закрыл «API key disclosure through ordinary document reads»
 *    (GHSA-238x-w2j9-gwwr, Dependabot #92): ключ больше не читается НИКЕМ — ни admin, ни агентом,
 *    ни через REST/GraphQL/local API. Он виден один раз, в момент генерации в админке. Агенты
 *    при этом обязаны по-прежнему входить по ключу — иначе встанет очередь `agent-proposals`.
 */

const RUN = `cred-${Date.now()}`
const PASSWORD = `pw-${randomUUID()}`
const CURRENT_PREFIX = 'pbkdf2-sha256-v1:'

let payload: Payload
let admin: User & { collection: 'users' }

/** Хеш ровно в формате Payload ≤3.89: hex-соль 32 байта, 25 000 итераций, ключ 512 байт, без префикса. */
function legacyHash(password: string) {
  const salt = randomBytes(32).toString('hex')
  const hash = pbkdf2Sync(password, salt, 25_000, 512, 'sha256').toString('hex')
  return { salt, hash }
}

async function storedHash(id: number): Promise<{ hash: string; salt: string }> {
  const { rows } = await payload.db.pool.query('SELECT hash, salt FROM users WHERE id = $1', [id])
  return rows[0]
}

async function createUser(role: User['role'], data: Partial<User> = {}) {
  return payload.create({
    collection: 'users',
    data: { email: `${RUN}-${role}-${randomUUID()}@test.local`, password: PASSWORD, role, ...data },
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'users', where: { email: { like: `${RUN}-` } } })
  admin = { ...(await createUser('admin')), collection: 'users' }
}, 180_000)

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'users', where: { email: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 180_000)

describe('пароли: хеши, записанные Payload ≤3.89', () => {
  it('старый хеш пускает с верным паролем и перехешируется в новый формат', async () => {
    const user = await createUser('editor')
    // Пишем адаптером напрямую: так хеш попадает в БД без единого хука, как у живых аккаунтов.
    await payload.db.updateOne({ collection: 'users', id: user.id, data: legacyHash(PASSWORD) })
    const before = await storedHash(user.id)
    expect(before.hash.startsWith(CURRENT_PREFIX)).toBe(false)

    const login = await payload.login({
      collection: 'users',
      data: { email: user.email, password: PASSWORD },
    })
    expect(login.token).toBeTruthy()

    const after = await storedHash(user.id)
    expect(after.hash.startsWith(CURRENT_PREFIX)).toBe(true)
    expect(after.salt).not.toBe(before.salt)

    // И уже перехешированный аккаунт пускает дальше.
    const again = await payload.login({
      collection: 'users',
      data: { email: user.email, password: PASSWORD },
    })
    expect(again.token).toBeTruthy()
  }, 60_000)

  it('старый хеш НЕ пускает с неверным паролем и не перезаписывается', async () => {
    const user = await createUser('viewer')
    await payload.db.updateOne({ collection: 'users', id: user.id, data: legacyHash(PASSWORD) })
    const before = await storedHash(user.id)

    await expect(
      payload.login({ collection: 'users', data: { email: user.email, password: 'wrong' } }),
    ).rejects.toThrow()
    expect(await storedHash(user.id)).toEqual(before)
  }, 60_000)

  it('новые пароли сразу пишутся усиленным хешем', async () => {
    const user = await createUser('translator')
    expect((await storedHash(user.id)).hash.startsWith(CURRENT_PREFIX)).toBe(true)
  })
})

describe('API-ключ агента', () => {
  const KEY = `agent-key-${randomUUID()}`
  let agent: User & { collection: 'users' }

  beforeAll(async () => {
    const created = await createUser('agent')
    // Выдаёт ключ admin — через access-проверки, как в админке (3.90 пускает к полям ключа
    // только тех, у кого есть доступ в админку; у нас update `users` и так только admin).
    await payload.update({
      collection: 'users',
      id: created.id,
      data: { enableAPIKey: true, apiKey: KEY },
      user: admin,
      overrideAccess: false,
    })
    agent = { ...created, collection: 'users' }
  }, 60_000)

  it('ключ аутентифицирует агента, чужой ключ — нет', async () => {
    const ok = await payload.auth({
      headers: new Headers({ Authorization: `users API-Key ${KEY}` }),
    })
    expect(ok.user?.id).toBe(agent.id)
    expect((ok.user as User | null)?.role).toBe('agent')

    const bad = await payload.auth({
      headers: new Headers({ Authorization: `users API-Key ${KEY}-forged` }),
    })
    expect(bad.user).toBeNull()
  })

  it.each(['admin', 'agent'] as const)('%s не может прочитать ключ после выдачи', async (who) => {
    const doc = await payload.findByID({
      collection: 'users',
      id: agent.id,
      user: who === 'admin' ? admin : agent,
      overrideAccess: false,
    })
    expect(doc.email).toBe(agent.email)
    expect(doc.apiKey).toBeUndefined()
    expect(doc.apiKeyIndex).toBeUndefined()
  })

  it('агент не может перевыпустить себе ключ', async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: agent.id,
        data: { apiKey: `${KEY}-rotated-by-agent` },
        user: agent,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const stillOk = await payload.auth({
      headers: new Headers({ Authorization: `users API-Key ${KEY}` }),
    })
    expect(stillOk.user?.id).toBe(agent.id)
  })
})
