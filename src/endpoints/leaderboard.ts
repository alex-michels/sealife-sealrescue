import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Server-authoritative лидерборд (SH-06/07). Публичный клиент НЕ пишет в БД напрямую —
 * только через эти endpoints: валидация (Zod), анти-чит (плаузибилити-капы),
 * transient rate-limit (IP в БД НЕ хранится). PII не хранится.
 *
 * Имя игрока локализуемо и варьируется по шаблонам (Adj/Mod/Pref-/-Suf + Noun), что
 * расширяет пространство имён до ~40k без чисел. Идентичность собирается из (seed, game)
 * детерминированным PRNG → набор частей (locale-независимо). В БД храним canonical EN-рендер
 * (alias, ключ дедупа) + части (nameParts, для локализации на клиенте). Свободного текста нет
 * (нет UGC). Дедуп: одна строка на (game, alias, board, season), храним МАКСИМУМ счёта.
 *
 *  POST /api/leaderboard   — отправить результат (upsert max), вернуть ранг + первую страницу
 *  GET  /api/leaderboard   — прочитать доску (?game=&board=&page=&limit=)
 */

// ⚠️ KEEP IN SYNC (порядок/длина списков, PATTERNS, mulberry32, порядок бросков) с
// public/games/seal-hunt-v1/core/alias.js — иначе имя на старте разойдётся с доской.
const ADJ_EN = [
  'Salty', 'Brave', 'Sleepy', 'Cosy', 'Misty', 'Sunny', 'Plump', 'Swift',
  'Gentle', 'Jolly', 'Bold', 'Lucky', 'Mellow', 'Nimble', 'Quiet', 'Shiny',
  'Snug', 'Tidal', 'Wavy', 'Zippy', 'Pebbly', 'Breezy', 'Frosty', 'Glossy',
  'Hardy', 'Merry', 'Splashy', 'Whiskered', 'Mighty', 'Deep', 'Ancient', 'Pearly',
  'Amber', 'Spotted', 'Prickly', 'Slippery', 'Foamy', 'Grumpy', 'Royal', 'Curious',
]
const MOD_EN = [
  'Chonky', 'Fluffy', 'Round', 'Smol', 'Beeg', 'Derpy', 'Sandy', 'Pudgy',
  'Floofy', 'Squishy', 'Blubbery', 'Cuddly',
]
const NOUN_EN = [
  'Seal', 'Walrus', 'Whale', 'Dolphin', 'Narwhal', 'Spermwhale', 'Crab', 'Octopus',
  'Squid', 'Lobster', 'Anchovy', 'Salmon', 'Burbot', 'Perch', 'Eel', 'Ray',
  'Seahorse', 'Krill', 'Coral', 'Kraken', 'Triton', 'Merman', 'Catfish', 'Bubble',
  'Buoy', 'Anchor', 'Reef', 'Beacon', 'Cormorant', 'Puffin', 'Penguin', 'Sturgeon',
  'Halibut', 'Marlin', 'Sprat', 'Pollock', 'Tuna', 'Crayfish', 'Urchin', 'Mollusk',
  'Scallop', 'Leviathan', 'Serpent', 'Pelican',
  // — милые/умилительные (M-DE-NAMES); локализация рода/слов — на клиенте (alias.js), здесь канонический EN.
  'Sealie', 'Chonker', 'Toughie', 'Nixie', 'Gobbler', 'Zucchini', 'Sea Cucumber', 'Spud',
  'Submarine', 'Donut', 'Dumplet',
]
const PREFIX_EN = ['Seal', 'Pup', 'Selkie', 'Walrus']
const SUFFIX_EN = ['Bun', 'Loaf', 'Blob', 'Bean', 'Pud']

// Шаблоны имени: какие части участвуют (noun есть всегда).
const PATTERNS: Array<{ adj?: boolean; mod?: boolean; pref?: boolean; suf?: boolean }> = [
  {}, { adj: true }, { mod: true }, { adj: true, mod: true },
  { pref: true }, { adj: true, pref: true }, { suf: true }, { adj: true, suf: true },
]

type NameParts = { adj?: number; mod?: number; noun: number; pref?: number; suf?: number }

function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}
function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Детерминированные части имени из (seed, game). Соль по игре → разные имена в разных играх. */
export function makeParts(seed: number, game: string): NameParts {
  const rnd = mulberry32(((seed >>> 0) ^ hashStr(game)) >>> 0)
  const patIdx = Math.floor(rnd() * PATTERNS.length)
  const adj = Math.floor(rnd() * ADJ_EN.length)
  const mod = Math.floor(rnd() * MOD_EN.length)
  const noun = Math.floor(rnd() * NOUN_EN.length)
  const pref = Math.floor(rnd() * PREFIX_EN.length)
  const suf = Math.floor(rnd() * SUFFIX_EN.length)
  const pat = PATTERNS[patIdx]
  const parts: NameParts = { noun }
  if (pat.adj) parts.adj = adj
  if (pat.mod) parts.mod = mod
  if (pat.pref) parts.pref = pref
  if (pat.suf) parts.suf = suf
  return parts
}

/** Недельный односторонний ключ игрока. Сырой seed НЕ хранится; хэш ротируется по season. */
function playerKeyFor(seed: number, game: string, season: string): string {
  return createHash('sha256').update(`${seed}:${game}:${season}`).digest('hex').slice(0, 24)
}

/** Канонический EN base-рендер (без суффикса). */
export function renderEn(p: NameParts): string {
  const out: string[] = []
  if (p.adj != null) out.push(ADJ_EN[p.adj])
  if (p.mod != null) out.push(MOD_EN[p.mod])
  let n = NOUN_EN[p.noun]
  if (p.pref != null) n = `${PREFIX_EN[p.pref]} ${n}`
  if (p.suf != null) n = `${n} ${SUFFIX_EN[p.suf]}`
  out.push(n)
  return out.join(' ')
}

/** ISO-неделя (YYYY-Www) — сезон доски, сбрасывается еженедельно. */
function currentSeason(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const week =
    1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Конец сезона = старт следующей ISO-недели (ближайший понедельник 00:00 UTC). */
function seasonEnd(d = new Date()): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = (date.getUTCDay() + 6) % 7 // 0=Пн … 6=Вс
  date.setUTCDate(date.getUTCDate() + (7 - dow)) // следующий понедельник
  return date // 00:00 UTC
}

// — Ленивая еженедельная очистка: удаляем прошлые сезоны (не чаще раза в час на процесс).
// Анонимные данные не нужны после сброса → минимизация + ограничение роста БД.
let lastPrune = 0
async function pruneOldSeasons(req: PayloadRequest, season: string): Promise<void> {
  const now = Date.now()
  if (now - lastPrune < 3_600_000) return
  lastPrune = now
  try {
    await req.payload.delete({ collection: 'game-scores', where: { season: { not_equals: season } } })
  } catch {
    /* best-effort */
  }
}

// — Transient rate-limit (в памяти, без сохранения IP).
const HITS = new Map<string, number[]>()
function rateLimited(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now()
  const arr = (HITS.get(ip) ?? []).filter((t) => now - t < windowMs)
  arr.push(now)
  HITS.set(ip, arr)
  return arr.length > limit
}
function clientIp(req: PayloadRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  return (xff ? xff.split(',')[0]?.trim() : '') || req.headers.get('x-real-ip') || 'local'
}

// — Play-token (анти-чит, SH-08): подписанный HMAC-токен выдаётся на СТАРТЕ игры; на submit
// проверяется подпись, привязка к game/board, возраст (нужно реально отыграть ~раунд) и
// одноразовость. Без БД/PII: секрет подписывает stateless-токен, израсходованные nonce —
// в памяти. Это поднимает планку: счёт нельзя залить, не «прожив» ~раунд, и токен — на 1 раз.
const TOKEN_TTL_MS = 1_800_000 // 30 мин — окно валидности токена
// Раунд = 60с. Нижняя граница реально отыгранного времени — с запасом под задержку выдачи
// play-token: токен метит время, когда ОТВЕТИЛ `/start`, а холодный старт роутдендпоинта
// (особенно dev/Turbopack — наблюдали 6.4с, первый компайл бывает 10–20с) съедает margin и
// легитимный 60-секундный раунд получает `token_age`. 40с всё ещё требует существенной игры.
const MIN_PLAY_MS = 40_000
type TokenData = { g: string; b: string; t: number; n: string }
function tokenSecret(): string {
  return process.env.PAYLOAD_SECRET || 'seal-dev-secret'
}
function signToken(game: string, board: string): string {
  const body = Buffer.from(JSON.stringify({ g: game, b: board, t: Date.now(), n: randomBytes(9).toString('hex') })).toString('base64url')
  const sig = createHmac('sha256', tokenSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}
function verifyToken(token: string): TokenData | null {
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expect = createHmac('sha256', tokenSecret()).update(body).digest('base64url')
  const a = Buffer.from(sig), b = Buffer.from(expect)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const d = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenData
    if (typeof d.g === 'string' && typeof d.b === 'string' && typeof d.t === 'number' && typeof d.n === 'string') return d
  } catch {
    /* ignore */
  }
  return null
}
const usedNonces = new Map<string, number>()
function consumeNonce(n: string): boolean {
  const now = Date.now()
  if (usedNonces.size > 5000) for (const [k, exp] of usedNonces) if (exp < now) usedNonces.delete(k)
  if (usedNonces.has(n)) return false
  usedNonces.set(n, now + TOKEN_TTL_MS)
  return true
}

const Board = z.enum(['desktop', 'mobile'])
const SubmitBody = z.object({
  game: z.string().min(1).max(64),
  score: z.number().int().min(0).max(100_000),
  durationMs: z.number().int().min(0).max(600_000),
  board: Board,
  seed: z.number().int().min(0).max(4_294_967_295),
  token: z.string().min(10).max(512),
})

const PAGE_SIZE = 50
const MAX_LIMIT = 100

async function gameIdBySlug(req: PayloadRequest, slug: string): Promise<number | null> {
  const { docs } = await req.payload.find({
    collection: 'games',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  return docs[0] ? (docs[0].id as number) : null
}

async function page(
  req: PayloadRequest,
  game: number,
  board: 'desktop' | 'mobile',
  season: string,
  pageNum: number,
  limit: number,
) {
  const where = { game: { equals: game }, board: { equals: board }, season: { equals: season } }
  const res = await req.payload.find({
    collection: 'game-scores',
    where,
    sort: ['-score', 'createdAt'],
    limit,
    page: pageNum,
    depth: 0,
  })
  const offset = (pageNum - 1) * limit
  const top = res.docs.map((d, i) => ({
    rank: offset + i + 1,
    alias: d.alias as string,
    parts: d.nameParts as NameParts,
    suffix: (d.suffix as number) ?? 0,
    score: d.score as number,
  }))
  return { top, total: res.totalDocs, page: pageNum, hasMore: res.hasNextPage }
}

export const leaderboardSubmit: Endpoint = {
  path: '/leaderboard',
  method: 'post',
  handler: async (req) => {
    if (rateLimited(clientIp(req))) {
      return Response.json({ error: 'rate_limited' }, { status: 429 })
    }

    let raw: unknown
    try {
      raw = await req.json?.()
    } catch {
      return Response.json({ error: 'bad_json' }, { status: 400 })
    }

    const parsed = SubmitBody.safeParse(raw)
    if (!parsed.success) {
      return Response.json({ error: 'invalid_input' }, { status: 400 })
    }
    const { game: slug, score, durationMs, board, seed, token } = parsed.data

    // — Play-token: подпись, привязка к game/board, реально отыгранное время, одноразовость.
    const tok = verifyToken(token)
    if (!tok || tok.g !== slug || tok.b !== board) {
      return Response.json({ error: 'invalid_token' }, { status: 401 })
    }
    const elapsed = Date.now() - tok.t
    if (elapsed < MIN_PLAY_MS || elapsed > TOKEN_TTL_MS) {
      return Response.json({ error: 'token_age' }, { status: 422 })
    }
    // Заявленная длительность не может превышать реально прошедшее время + запас на задержку
    // выдачи токена (см. MIN_PLAY_MS). 20с покрывает холодный старт `/start`, не пропуская читы.
    if (durationMs > elapsed + 20_000) {
      return Response.json({ error: 'duration_mismatch' }, { status: 422 })
    }

    // — Анти-чит: длительность раунда фиксирована (~60с) и счёт правдоподобен.
    // CATCH_PER_SEC_CAP — потолок «пойманных в секунду». Запас над реальным человеком;
    // подстраивать по анонимизированному распределению очков, когда появится трафик (SH-08).
    if (durationMs < 50_000 || durationMs > 70_000) {
      return Response.json({ error: 'implausible_duration' }, { status: 422 })
    }
    const CATCH_PER_SEC_CAP = 3
    const maxScore = Math.ceil((durationMs / 1000) * CATCH_PER_SEC_CAP) + 8
    if (score > maxScore) {
      return Response.json({ error: 'implausible_score' }, { status: 422 })
    }

    if (!consumeNonce(tok.n)) {
      return Response.json({ error: 'token_used' }, { status: 409 })
    }

    const game = await gameIdBySlug(req, slug)
    if (game == null) {
      return Response.json({ error: 'unknown_game' }, { status: 404 })
    }

    const season = currentSeason()
    const parts = makeParts(seed, slug)
    const baseAlias = renderEn(parts)
    const playerKey = playerKeyFor(seed, slug, season)

    // — Идентичность игрока за неделю = playerKey. Одна строка на (game, playerKey, board, season).
    const mineRes = await req.payload.find({
      collection: 'game-scores',
      where: {
        game: { equals: game },
        playerKey: { equals: playerKey },
        board: { equals: board },
        season: { equals: season },
      },
      limit: 1,
      depth: 0,
    })
    const mine = mineRes.docs[0]
    let best = score
    let alias: string
    let suffix: number
    if (mine) {
      // тот же игрок: храним максимум счёта.
      best = Math.max(mine.score as number, score)
      // Имя — детерминированная f(seed) от текущих списков. Если списки имён менялись между
      // сабмитами (деплой), сохранённые части устаревают и строка доски расходится с приветствием.
      // Сравниваем по полям (jsonb не хранит порядок ключей) и при расхождении освежаем идентичность.
      const np = (mine.nameParts ?? {}) as NameParts
      const partsChanged =
        np.noun !== parts.noun ||
        np.adj !== parts.adj ||
        np.mod !== parts.mod ||
        np.pref !== parts.pref ||
        np.suf !== parts.suf
      if (partsChanged) {
        // Пересчитываем суффикс уникальности под НОВЫЙ base (исключая себя).
        const sameBase = await req.payload.count({
          collection: 'game-scores',
          where: {
            game: { equals: game },
            baseAlias: { equals: baseAlias },
            board: { equals: board },
            season: { equals: season },
            id: { not_equals: mine.id },
          },
        })
        suffix = sameBase.totalDocs >= 1 ? sameBase.totalDocs + 1 : 0
        alias = suffix >= 2 ? `${baseAlias} ${suffix}` : baseAlias
        await req.payload.update({
          collection: 'game-scores',
          id: mine.id,
          data: {
            baseAlias,
            suffix,
            alias,
            nameParts: parts,
            score: best,
            ...(score > (mine.score as number) ? { durationMs } : {}),
          },
        })
      } else {
        alias = mine.alias as string
        suffix = (mine.suffix as number) ?? 0
        if (score > (mine.score as number)) {
          await req.payload.update({ collection: 'game-scores', id: mine.id, data: { score, durationMs } })
        }
      }
    } else {
      // новый игрок за неделю: уникализируем ИМЯ суффиксом при коллизии base с ДРУГИМ игроком
      const sameBase = await req.payload.count({
        collection: 'game-scores',
        where: {
          game: { equals: game },
          baseAlias: { equals: baseAlias },
          board: { equals: board },
          season: { equals: season },
        },
      })
      suffix = sameBase.totalDocs >= 1 ? sameBase.totalDocs + 1 : 0
      alias = suffix >= 2 ? `${baseAlias} ${suffix}` : baseAlias
      await req.payload.create({
        collection: 'game-scores',
        data: { game, playerKey, baseAlias, suffix, alias, nameParts: parts, score, durationMs, board, season },
      })
    }

    // — Ранг по лучшему счёту игрока.
    const better = await req.payload.count({
      collection: 'game-scores',
      where: {
        game: { equals: game },
        board: { equals: board },
        season: { equals: season },
        score: { greater_than: best },
      },
    })
    const rank = better.totalDocs + 1
    const first = await page(req, game, board, season, 1, PAGE_SIZE)
    const percentile = first.total > 0 ? Math.max(1, Math.round((rank / first.total) * 100)) : 100

    void pruneOldSeasons(req, season)

    return Response.json({
      alias,
      parts,
      suffix,
      board,
      season,
      resetAt: seasonEnd().toISOString(),
      score: best,
      submitted: score,
      improved: !mine || score > (mine.score as number),
      rank,
      total: first.total,
      percentile,
      page: 1,
      hasMore: first.hasMore,
      top: first.top,
    })
  },
}

export const leaderboardRead: Endpoint = {
  path: '/leaderboard',
  method: 'get',
  handler: async (req) => {
    const url = new URL(req.url ?? '')
    const slug = url.searchParams.get('game') ?? ''
    const boardParsed = Board.safeParse(url.searchParams.get('board') ?? 'desktop')
    const board = boardParsed.success ? boardParsed.data : 'desktop'
    const pageNum = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit') ?? String(PAGE_SIZE), 10) || PAGE_SIZE))
    const season = currentSeason()

    const resetAt = seasonEnd().toISOString()
    const game = slug ? await gameIdBySlug(req, slug) : null
    if (game == null) {
      return Response.json({ board, season, resetAt, total: 0, page: pageNum, hasMore: false, top: [] })
    }
    const res = await page(req, game, board, season, pageNum, limit)
    return Response.json({ board, season, resetAt, ...res })
  },
}

/** Выдать play-token на старте раунда (анти-чит, SH-08). */
export const leaderboardStart: Endpoint = {
  path: '/leaderboard/start',
  method: 'get',
  handler: async (req) => {
    const url = new URL(req.url ?? '')
    const slug = url.searchParams.get('game') ?? ''
    const boardParsed = Board.safeParse(url.searchParams.get('board') ?? 'desktop')
    const board = boardParsed.success ? boardParsed.data : 'desktop'
    if (!slug) return Response.json({ error: 'bad_request' }, { status: 400 })
    return Response.json({ token: signToken(slug, board) })
  },
}
