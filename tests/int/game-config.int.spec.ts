import { getPayload, type Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { gameConfigRead } from '@/endpoints/gameConfig'
import { setGameStandaloneComingSoon } from '@/seed/lib'

/**
 * SH-14: контракт /api/game-config — kill-switch standalone-версий игр.
 *
 * Семантика поля `games.standaloneComingSoon` (тумблер в админке):
 *  - false/НЕ ЗАДАНО (null у строк, созданных до появления поля) → standalone: true —
 *    пуш схемы не гасит игру ни на альфе, ни в CI;
 *  - true → standalone: false (клиенты показывают заглушку «Coming soon»);
 *  - неизвестный slug → standalone: false (незасеянная игра не должна быть играбельной);
 *  - черновик тумблера НЕ влияет до Publish (эндпоинт читает draft: false).
 *
 * Техника — как в leaderboard.int.spec.ts: хендлер вызывается напрямую
 * с Web `Request` + привязанным payload, без HTTP-сервера.
 */

const RUN = `sh14-${Date.now()}`
const GAME_ON = `${RUN}-on`
const GAME_OFF = `${RUN}-off`
const GAME_LEGACY = `${RUN}-legacy` // симулирует строку, созданную до появления поля (null)
const GHOST = `${RUN}-ghost`

let payload: Payload
let onId: number

function bind(req: Request): PayloadRequest {
  const r = req as unknown as PayloadRequest
  ;(r as unknown as { payload: Payload }).payload = payload
  return r
}

async function readCfg(query: string) {
  const res = await gameConfigRead.handler(
    bind(new Request(`http://localhost:3000/api/game-config${query}`)),
  )
  return {
    status: res.status,
    json: (await res.json()) as Record<string, unknown>,
    cache: res.headers.get('cache-control'),
  }
}

beforeAll(async () => {
  payload = await getPayload({ config })
  const on = await payload.create({
    collection: 'games',
    data: { title: `${RUN} on`, slug: GAME_ON, _status: 'published' },
  })
  onId = on.id as number
  await payload.create({
    collection: 'games',
    data: { title: `${RUN} off`, slug: GAME_OFF, _status: 'published', standaloneComingSoon: true },
  })
  await payload.create({
    collection: 'games',
    data: {
      title: `${RUN} legacy`,
      slug: GAME_LEGACY,
      _status: 'published',
      standaloneComingSoon: null as unknown as boolean,
    },
  })
}, 120_000)

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'games', where: { slug: { like: `${RUN}-` } } })
})

describe('SH-14: /api/game-config', () => {
  it('без ?game → 400', async () => {
    const r = await readCfg('')
    expect(r.status).toBe(400)
  })

  it('опубликованная игра без флага → standalone: true (+кэш ≤ 60 c)', async () => {
    const r = await readCfg(`?game=${GAME_ON}`)
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ standalone: true })
    expect(r.cache).toContain('max-age=60')
  })

  it('флаг включён → standalone: false (заглушка)', async () => {
    const r = await readCfg(`?game=${GAME_OFF}`)
    expect(r.json).toEqual({ standalone: false })
  })

  it('legacy-строка с null (создана до появления поля) → standalone: true', async () => {
    const r = await readCfg(`?game=${GAME_LEGACY}`)
    expect(r.json).toEqual({ standalone: true })
  })

  it('неизвестный slug → standalone: false', async () => {
    const r = await readCfg(`?game=${GHOST}`)
    expect(r.json).toEqual({ standalone: false })
  })

  it('setGameStandaloneComingSoon (скрипт/workflow вместо недоступной админки) переключает published-флаг', async () => {
    const slug = `${RUN}-toggle`
    await payload.create({
      collection: 'games',
      data: { title: `${RUN} toggle`, slug, _status: 'published' },
    })
    expect(await setGameStandaloneComingSoon(payload, slug, true)).toBe(true)
    expect((await readCfg(`?game=${slug}`)).json).toEqual({ standalone: false })
    expect(await setGameStandaloneComingSoon(payload, slug, false)).toBe(true)
    expect((await readCfg(`?game=${slug}`)).json).toEqual({ standalone: true })
    // Неизвестная игра — честный false, без создания записи.
    expect(await setGameStandaloneComingSoon(payload, `${RUN}-nope`, true)).toBe(false)
  })

  it('ЧЕРНОВОЙ тумблер не влияет до Publish; после Publish — влияет', async () => {
    // Черновик: включаем флаг, не публикуя.
    await payload.update({
      collection: 'games',
      id: onId,
      draft: true,
      data: { standaloneComingSoon: true },
    })
    expect((await readCfg(`?game=${GAME_ON}`)).json).toEqual({ standalone: true })

    // Publish той же правки → эндпоинт видит новый флаг.
    await payload.update({
      collection: 'games',
      id: onId,
      data: { standaloneComingSoon: true, _status: 'published' },
    })
    expect((await readCfg(`?game=${GAME_ON}`)).json).toEqual({ standalone: false })
  })
})
