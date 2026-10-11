// @vitest-environment node
// Вход подписывает JWT через `jose`, а тот в jsdom падает («payload must be an instance of
// Uint8Array»: TextEncoder jsdom отдаёт Uint8Array из другого realm). До SEC-09 `isLocked()`
// считал эту ошибку «не заблокирован», и проверка «владелец снова входит» проходила вхолостую.
import { getPayload, type Payload } from 'payload'
import type { User } from '@/payload-types'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

/**
 * Снятие блокировки аккаунта — только admin (Dependabot #54, GHSA-jg8r-5jh2-v2xj).
 *
 * У Payload по умолчанию `access.unlock = Boolean(user)`: любой вошедший пользователь сбрасывает
 * блокировку ЧУЖОГО аккаунта. Блокировка (`maxLoginAttempts` = 5) — это и есть защита от перебора
 * пароля, поэтому дефолт её обнуляет. У нас самая «выставленная» учётка — `agent` с API-ключом,
 * отданным автоматике: при утечке ключа можно было бы снимать блокировку с admin между попытками.
 *
 * Патча у Payload нет, поэтому правило доступа задано явно в `src/collections/Users.ts`. Тест идёт
 * по настоящему пути, а не подделывает поля: пять неверных паролей → аккаунт заблокирован →
 * попытки снять блокировку от каждой роли.
 */

const RUN = `unlock-${Date.now()}`
const PASSWORD = `pw-${RUN}`
const ROLES = ['admin', 'editor', 'translator', 'viewer', 'agent'] as const
type Role = (typeof ROLES)[number]

let payload: Payload
const actors = {} as Record<Role, User & { collection: 'users' }>
const TARGET = `${RUN}-target@test.local`

/**
 * Сгенерированный тип `unlock` требует `password`, но операция его не читает — только email/username
 * (`payload/dist/auth/operations/unlock.js`). В этом и суть уязвимости: чтобы снять чужую блокировку,
 * пароль владельца знать НЕ нужно. Поэтому сюда сознательно подставлен заведомо неверный пароль: то,
 * что admin всё равно снимает блокировку, и доказывает, что решает только правило доступа.
 */
const NOT_THE_PASSWORD = 'definitely-not-the-target-password'

/** Пять неверных паролей — ровно столько, сколько нужно для блокировки по умолчанию. */
async function lockTarget() {
  for (let i = 0; i < 5; i++) {
    await payload.login({ collection: 'users', data: { email: TARGET, password: 'wrong' } }).catch(() => {})
  }
}

/**
 * Заблокирован ли аккаунт — проверяем входом с ВЕРНЫМ паролем, как это увидит владелец.
 * Любая другая ошибка пробрасывается: иначе «не заблокирован» засчитывалось бы и тогда, когда
 * вход просто сломан (так и было в jsdom — см. комментарий в шапке файла, SEC-09).
 */
async function isLocked(): Promise<boolean> {
  try {
    const { token } = await payload.login({
      collection: 'users',
      data: { email: TARGET, password: PASSWORD },
    })
    expect(token).toBeTruthy()
    return false
  } catch (e) {
    if (/lock/i.test(String((e as Error).name) + String((e as Error).message))) return true
    throw e
  }
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'users', where: { email: { like: `${RUN}-` } } })
  for (const role of ROLES) {
    const doc = await payload.create({
      collection: 'users',
      data: { email: `${RUN}-${role}@test.local`, password: PASSWORD, role },
    })
    actors[role] = { ...doc, collection: 'users' }
  }
  await payload.create({
    collection: 'users',
    data: { email: TARGET, password: PASSWORD, role: 'admin' },
  })
}, 180_000)

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'users', where: { email: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 180_000)

describe('access.unlock на users', () => {
  it(
    'пять неверных паролей действительно блокируют аккаунт',
    async () => {
      // Без этого остальные проверки ничего бы не доказывали: «снять блокировку» с
      // незаблокированного аккаунта проходит и без всякого правила доступа.
      await lockTarget()
      expect(await isLocked()).toBe(true)
    },
    60_000,
  )

  for (const role of ['agent', 'viewer', 'translator', 'editor'] as const) {
    it(`${role} НЕ может снять блокировку чужого аккаунта`, async () => {
      await expect(
        payload.unlock({
          collection: 'users',
          data: { email: TARGET, password: NOT_THE_PASSWORD },
          req: { user: actors[role] },
          overrideAccess: false,
        }),
      ).rejects.toThrow()
      // И блокировка действительно осталась на месте, а не «упало, но успело записать».
      expect(await isLocked()).toBe(true)
    })
  }

  it(
    'admin снимает блокировку, и владелец снова может войти',
    async () => {
      await payload.unlock({
        collection: 'users',
        data: { email: TARGET, password: NOT_THE_PASSWORD },
        req: { user: actors.admin },
        overrideAccess: false,
      })
      expect(await isLocked()).toBe(false)
    },
    60_000,
  )
})
