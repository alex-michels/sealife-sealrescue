import crypto from 'crypto'
import { getPayload, type Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest'
import { leaderboardStart, leaderboardSubmit, leaderboardRead, makeParts, renderEn } from '@/endpoints/leaderboard'

/**
 * QA-15: контракт server-authoritative лидерборда (src/endpoints/leaderboard.ts) —
 * все ветки анти-чита, дедуп/upsert-max, пагинация, прунинг сезонов.
 *
 * Техника: хендлеры вызываются напрямую с Web `Request` + привязанным payload —
 * без HTTP-сервера, но через весь реальный код endpoint'а.
 *
 * Время: play-token должен «пожить» ≥40 с (MIN_PLAY_MS) — ждать нельзя (политика QA-12),
 * поэтому фейкается ТОЛЬКО Date (vi.useFakeTimers({ toFake: ['Date'] })): pg-пул и
 * таймеры работают реально, а возраст токена сдвигается setSystemTime.
 *
 * Rate-limit: транзиентный, на IP. Каждый запрос по умолчанию получает УНИКАЛЬНЫЙ
 * x-forwarded-for, чтобы тесты не душили друг друга; лимит проверяется отдельным
 * тестом с фиксированным IP.
 */

const RUN = `qa15-${Date.now()}`
const GAME = `${RUN}-game`
const GAME_PAGES = `${RUN}-pages`
const GAME_COLLIDE = `${RUN}-collide` // изолированная игра для теста коллизии имён
const GHOST = `${RUN}-ghost` // slug без строки в games

const BASE_TIME = new Date('2026-07-01T12:00:00Z') // середина ISO-недели — тесты её не пересекают

let payload: Payload
let gameId: number
let season = '' // берём из первого ответа submit

let ipCounter = 0
const nextIp = () => `ip-${RUN}-${++ipCounter}`

function bind(req: Request): PayloadRequest {
  const r = req as unknown as PayloadRequest
  ;(r as unknown as { payload: Payload }).payload = payload
  return r
}

async function start(game: string) {
  const res = await leaderboardStart.handler(
    bind(new Request(`http://localhost:3000/api/leaderboard/start?game=${game}`)),
  )
  return (await res.json()) as { token: string }
}

async function post(body: unknown, ip?: string) {
  const res = await leaderboardSubmit.handler(
    bind(
      new Request('http://localhost:3000/api/leaderboard', {
        method: 'POST',
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip ?? nextIp() },
      }),
    ),
  )
  return { status: res.status, json: (await res.json()) as Record<string, unknown> }
}

async function readBoard(params: string) {
  const res = await leaderboardRead.handler(
    bind(new Request(`http://localhost:3000/api/leaderboard?${params}`)),
  )
  return (await res.json()) as {
    total: number
    page: number
    hasMore: boolean
    top: Array<{ rank: number; alias: string; score: number }>
    season: string
  }
}

/** Полный валидный раунд: start → состарить токен → submit. */
async function playRound(opts: {
  game?: string
  seed?: number
  score?: number
  durationMs?: number
  ageMs?: number
  ip?: string
  token?: string
}) {
  const game = opts.game ?? GAME
  const token = opts.token ?? (await start(game)).token
  vi.setSystemTime(Date.now() + (opts.ageMs ?? 65_000))
  const res = await post(
    {
      game,
      score: opts.score ?? 42,
      durationMs: opts.durationMs ?? 60_000,
      seed: opts.seed ?? 1,
      token,
    },
    opts.ip,
  )
  return { ...res, token }
}

const playerKeyFor = (seed: number, game: string, s: string) =>
  crypto.createHash('sha256').update(`${seed}:${game}:${s}`).digest('hex').slice(0, 24)

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(BASE_TIME)

  payload = await getPayload({ config: await config })
  const game = await payload.create({
    collection: 'games',
    data: { title: `${RUN} game`, slug: GAME, _status: 'published' },
  })
  gameId = game.id as number
  await payload.create({
    collection: 'games',
    data: { title: `${RUN} pages`, slug: GAME_PAGES, _status: 'published' },
  })
  await payload.create({
    collection: 'games',
    data: { title: `${RUN} collide`, slug: GAME_COLLIDE, _status: 'published' },
  })
  // Строка прошлого сезона — должна исчезнуть после первого successful submit (lazy prune).
  await payload.create({
    collection: 'game-scores',
    data: {
      game: gameId,
      playerKey: `${RUN}-old-season`,
      baseAlias: 'Old Seal',
      suffix: 0,
      alias: 'Old Seal',
      nameParts: { noun: 0 },
      score: 1,
      durationMs: 60_000,
      season: '2020-W01',
    },
  })
}, 120_000)

afterAll(async () => {
  vi.useRealTimers()
  if (!payload) return
  const games = await payload.find({
    collection: 'games',
    where: { slug: { like: `${RUN}-` } },
    depth: 0,
  })
  for (const g of games.docs) {
    await payload.delete({ collection: 'game-scores', where: { game: { equals: g.id } } })
  }
  await payload.delete({ collection: 'games', where: { slug: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 120_000)

describe('happy path', () => {
  it('start → submit → read: счёт на доске, ранг/percentile/season в ответе', async () => {
    const { status, json } = await playRound({ seed: 7, score: 55 })
    expect(status).toBe(200)
    season = json.season as string
    expect(json.alias).toBe(renderEn(makeParts(7, GAME)))
    expect(json.improved).toBe(true)
    expect(json.score).toBe(55)
    expect(json.rank).toBe(1)
    expect(typeof json.resetAt).toBe('string')
    expect((json.top as Array<{ alias: string }>).map((t) => t.alias)).toContain(json.alias)

    const board = await readBoard(`game=${GAME}`)
    expect(board.total).toBe(1)
    expect(board.top[0]).toMatchObject({ rank: 1, score: 55 })
  })

  it('lazy prune: строка прошлого сезона удалена после первого submit', async () => {
    await expect
      .poll(
        async () => {
          const res = await payload.count({
            collection: 'game-scores',
            where: { playerKey: { equals: `${RUN}-old-season` } },
          })
          return res.totalDocs
        },
        { timeout: 5_000 },
      )
      .toBe(0)
  })
})

describe('валидация и анти-чит', () => {
  it('битый JSON → 400 bad_json', async () => {
    const { status, json } = await post('not-json{')
    expect(status).toBe(400)
    expect(json.error).toBe('bad_json')
  })

  it('Zod-отказ (отрицательный score, кривой seed) → 400 invalid_input', async () => {
    for (const bad of [
      { game: GAME, score: -1, durationMs: 60_000, seed: 1, token: 'x'.repeat(16) },
      { game: GAME, score: 10, durationMs: 60_000, seed: -5, token: 'x'.repeat(16) },
      { game: GAME, score: 10 },
    ]) {
      const { status, json } = await post(bad)
      expect(status, JSON.stringify(bad)).toBe(400)
      expect(json.error).toBe('invalid_input')
    }
  })

  it('лишний board старого клиента молча отбрасывается (обратная совместимость)', async () => {
    const { token } = await start(GAME)
    vi.setSystemTime(Date.now() + 65_000)
    const { status } = await post({
      game: GAME,
      score: 11,
      durationMs: 60_000,
      board: 'desktop', // поле снято 2026-07-03; старый клиент его ещё шлёт
      seed: 31337,
      token,
    })
    expect(status).toBe(200)
  })

  it('мусорный токен → 401 invalid_token', async () => {
    const { status, json } = await post({
      game: GAME,
      score: 10,
      durationMs: 60_000,
      seed: 1,
      token: 'garbage.token-value',
    })
    expect(status).toBe(401)
    expect(json.error).toBe('invalid_token')
  })

  it('токен чужой игры → 401 invalid_token', async () => {
    const { token } = await start(GAME_PAGES)
    vi.setSystemTime(Date.now() + 65_000)
    const { status, json } = await post({
      game: GAME,
      score: 10,
      durationMs: 60_000,
      seed: 1,
      token,
    })
    expect(status).toBe(401)
    expect(json.error).toBe('invalid_token')
  })

  it('слишком молодой токен (submit сразу после start) → 422 token_age', async () => {
    const { token } = await start(GAME)
    const { status, json } = await post({
      game: GAME,
      score: 10,
      durationMs: 60_000,
      seed: 1,
      token,
    })
    expect(status).toBe(422)
    expect(json.error).toBe('token_age')
  })

  it('протухший токен (старше TTL 30 мин) → 422 token_age', async () => {
    const { status, json } = await playRound({ ageMs: 31 * 60_000 })
    expect(status).toBe(422)
    expect(json.error).toBe('token_age')
  })

  it('заявленная длительность больше реально прошедшей → 422 duration_mismatch', async () => {
    // elapsed 45 c, заявлено 66 c > 45+20 → mismatch (и в пределах 50–70 c, чтобы дойти до ветки).
    const { status, json } = await playRound({ ageMs: 45_000, durationMs: 66_000 })
    expect(status).toBe(422)
    expect(json.error).toBe('duration_mismatch')
  })

  it('неправдоподобная длительность раунда → 422 implausible_duration', async () => {
    const { status, json } = await playRound({ durationMs: 45_000 })
    expect(status).toBe(422)
    expect(json.error).toBe('implausible_duration')
    const long = await playRound({ ageMs: 80_000, durationMs: 71_000 })
    expect(long.json.error).toBe('implausible_duration')
  })

  it('неправдоподобный счёт (выше капа catch/sec) → 422 implausible_score', async () => {
    // 60 c × 3/с + 8 = 188 максимум; 200 — чит.
    const { status, json } = await playRound({ score: 200 })
    expect(status).toBe(422)
    expect(json.error).toBe('implausible_score')
  })

  it('повторный submit того же токена → 409 token_used', async () => {
    const first = await playRound({ seed: 8, score: 20 })
    expect(first.status).toBe(200)
    const replay = await post({
      game: GAME,
      score: 25,
      durationMs: 60_000,
      seed: 8,
      token: first.token,
    })
    expect(replay.status).toBe(409)
    expect(replay.json.error).toBe('token_used')
  })

  it('неизвестная игра → 404 unknown_game', async () => {
    const { status, json } = await playRound({ game: GHOST })
    expect(status).toBe(404)
    expect(json.error).toBe('unknown_game')
  })

  it('rate-limit: 31-й запрос с одного IP за минуту → 429', async () => {
    const ip = `${RUN}-flood`
    for (let i = 0; i < 30; i++) {
      const { status } = await post({ nonsense: true }, ip)
      expect(status).toBe(400) // валидация, но НЕ 429
    }
    const { status, json } = await post({ nonsense: true }, ip)
    expect(status).toBe(429)
    expect(json.error).toBe('rate_limited')
  })
})

describe('идентичность и дедуп', () => {
  it('upsert-max: одна строка на игрока за неделю, хранится максимум', async () => {
    const seed = 777
    const first = await playRound({ seed, score: 50 })
    expect(first.json).toMatchObject({ improved: true, score: 50 })

    const lower = await playRound({ seed, score: 30 })
    expect(lower.json).toMatchObject({ improved: false, score: 50, submitted: 30 })

    const higher = await playRound({ seed, score: 60 })
    expect(higher.json).toMatchObject({ improved: true, score: 60 })

    const rows = await payload.count({
      collection: 'game-scores',
      where: { playerKey: { equals: playerKeyFor(seed, GAME, season) }, season: { equals: season } },
    })
    expect(rows.totalDocs).toBe(1)
  })

  it('смена name-списков (устаревшие nameParts в БД) → идентичность освежается', async () => {
    const seed = 4242
    // Строка «до деплоя»: части имени не совпадают с текущей f(seed).
    await payload.create({
      collection: 'game-scores',
      data: {
        game: gameId,
        playerKey: playerKeyFor(seed, GAME, season),
        baseAlias: 'Stale Name',
        suffix: 0,
        alias: 'Stale Name',
        nameParts: { noun: 999 },
        score: 10,
        durationMs: 60_000,
        season,
      },
    })
    const { json } = await playRound({ seed, score: 15 })
    expect(json.alias).toBe(renderEn(makeParts(seed, GAME)))
    const row = await payload.find({
      collection: 'game-scores',
      where: { playerKey: { equals: playerKeyFor(seed, GAME, season) } },
    })
    expect(row.docs[0].alias).toBe(renderEn(makeParts(seed, GAME)))
    expect(row.docs[0].score).toBe(15)
  })

  it('коллизия base-имени двух РАЗНЫХ игроков → суффикс « 2»', async () => {
    // Изолируем на отдельной игре (GAME_COLLIDE): доска единая (деление desktop/mobile
    // снято 2026-07-03), и на общем GAME чужой сабмит может СЛУЧАЙНО дать тот же base
    // и сдвинуть счётчик (флак в CI, «Marlin 3» vs «Marlin 2»). На GAME_COLLIDE
    // единственный носитель base — наша фикстура.
    const seed = 555
    const base = renderEn(makeParts(seed, GAME_COLLIDE))
    const collideGame = await payload.find({
      collection: 'games',
      where: { slug: { equals: GAME_COLLIDE } },
      depth: 0,
    })
    // Другой игрок уже занял этот base.
    await payload.create({
      collection: 'game-scores',
      data: {
        game: collideGame.docs[0].id as number,
        playerKey: `${RUN}-other-player`,
        baseAlias: base,
        suffix: 0,
        alias: base,
        nameParts: { noun: 0 },
        score: 99,
        durationMs: 60_000,
        season,
      },
    })
    const { json } = await playRound({ game: GAME_COLLIDE, seed, score: 12 })
    expect(json.alias).toBe(`${base} 2`)
    expect(json.suffix).toBe(2)
  })
})

describe('чтение доски', () => {
  it('пагинация: сортировка по счёту, ранги сквозные, hasMore', async () => {
    const pagesGame = await payload.find({
      collection: 'games',
      where: { slug: { equals: GAME_PAGES } },
      depth: 0,
    })
    const pgId = pagesGame.docs[0].id
    for (let i = 1; i <= 7; i++) {
      await payload.create({
        collection: 'game-scores',
        data: {
          game: pgId,
          playerKey: `${RUN}-p${i}`,
          baseAlias: `Player ${i}`,
          suffix: 0,
          alias: `Player ${i}`,
          nameParts: { noun: i },
          score: i * 10,
          durationMs: 60_000,
          season,
        },
      })
    }
    const p1 = await readBoard(`game=${GAME_PAGES}&page=1&limit=3`)
    expect(p1.total).toBe(7)
    expect(p1.hasMore).toBe(true)
    expect(p1.top.map((t) => t.score)).toEqual([70, 60, 50])
    expect(p1.top.map((t) => t.rank)).toEqual([1, 2, 3])

    const p3 = await readBoard(`game=${GAME_PAGES}&page=3&limit=3`)
    expect(p3.hasMore).toBe(false)
    expect(p3.top.map((t) => t.rank)).toEqual([7])
    expect(p3.top[0].score).toBe(10)
  })

  it('неизвестная игра в GET → пустая доска, не ошибка', async () => {
    const board = await readBoard(`game=${GHOST}`)
    expect(board.total).toBe(0)
    expect(board.top).toEqual([])
  })

  it('легаси ?board= игнорируется, кривые page/limit зажимаются', async () => {
    const board = await readBoard(`game=${GAME_PAGES}&board=fridge&page=0&limit=9999`)
    expect(board.total).toBeGreaterThan(0) // отработал с дефолтами, не упал
    expect(board.page).toBe(1)
  })
})
