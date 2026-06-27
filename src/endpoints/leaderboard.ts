import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'

/**
 * Server-authoritative лидерборд (SH-06/07). Публичный клиент НЕ пишет в БД напрямую —
 * только через эти endpoints: валидация (Zod), анти-чит (плаузибилити-капы),
 * transient rate-limit (IP в БД НЕ хранится). PII не хранится.
 *
 * Идентичность игрока — opaque `seed` в localStorage. Сервер детерминированно собирает
 * из (seed, game) ИНДЕКСЫ слов (locale-независимо) → курируемое имя «Прил. Существительное»
 * (без чисел, морская тематика). В БД храним индексы (идентичность) + EN-подпись для
 * админки. Имя локализуется на клиенте по индексам. Свободного текста нет (нет UGC).
 * Дедуп: одна строка на (game, adjIdx, nounIdx, board, season), храним МАКСИМУМ счёта.
 * Доска недельная (season), две доски (desktop/mobile), пагинация.
 *
 *  POST /api/leaderboard   — отправить результат (upsert max), вернуть ранг + первую страницу
 *  GET  /api/leaderboard   — прочитать доску (?game=&board=&page=&limit=)
 */

// ⚠️ KEEP IN SYNC (порядок и длина) с public/games/seal-hunt-v1/core/alias.js (.en значения).
// Имя рисуется на клиенте по индексам — критична длина списков; EN-слова нужны только для
// денормализованной подписи в админке.
const ADJ_EN = [
  'Salty', 'Brave', 'Sleepy', 'Cosy', 'Misty', 'Sunny', 'Plump', 'Swift',
  'Gentle', 'Jolly', 'Bold', 'Lucky', 'Mellow', 'Nimble', 'Quiet', 'Shiny',
  'Snug', 'Tidal', 'Wavy', 'Zippy', 'Pebbly', 'Breezy', 'Frosty', 'Glossy',
  'Hardy', 'Merry', 'Splashy', 'Whiskered', 'Mighty', 'Deep', 'Ancient', 'Pearly',
  'Amber', 'Spotted', 'Prickly', 'Slippery', 'Foamy', 'Grumpy', 'Royal', 'Curious',
]
const NOUN_EN = [
  'Seal', 'Walrus', 'Whale', 'Dolphin', 'Narwhal', 'Spermwhale', 'Crab', 'Octopus',
  'Squid', 'Lobster', 'Anchovy', 'Salmon', 'Burbot', 'Perch', 'Eel', 'Ray',
  'Seahorse', 'Krill', 'Coral', 'Kraken', 'Triton', 'Merman', 'Catfish', 'Bubble',
  'Buoy', 'Anchor', 'Reef', 'Beacon', 'Cormorant', 'Puffin', 'Penguin', 'Sturgeon',
  'Halibut', 'Marlin', 'Sprat', 'Pollock', 'Tuna', 'Crayfish', 'Urchin', 'Mollusk',
  'Scallop', 'Leviathan', 'Serpent', 'Pelican',
]

function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

/** Locale-независимые индексы имени: f(seed, game). Соль по игре → разные имена в разных играх. */
function nameIndices(seed: number, game: string): { adjIdx: number; nounIdx: number } {
  const e = ((seed >>> 0) ^ hashStr(game)) >>> 0
  return { adjIdx: e % ADJ_EN.length, nounIdx: Math.floor(e / ADJ_EN.length) % NOUN_EN.length }
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

const Board = z.enum(['desktop', 'mobile'])
const SubmitBody = z.object({
  game: z.string().min(1).max(64),
  score: z.number().int().min(0).max(100_000),
  durationMs: z.number().int().min(0).max(600_000),
  board: Board,
  seed: z.number().int().min(0).max(4_294_967_295),
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
    adj: d.adjIdx as number,
    noun: d.nounIdx as number,
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
    const { game: slug, score, durationMs, board, seed } = parsed.data

    // — Анти-чит: длительность раунда фиксирована (~60с) и счёт правдоподобен.
    if (durationMs < 50_000 || durationMs > 70_000) {
      return Response.json({ error: 'implausible_duration' }, { status: 422 })
    }
    const maxScore = Math.ceil((durationMs / 1000) * 4) + 5
    if (score > maxScore) {
      return Response.json({ error: 'implausible_score' }, { status: 422 })
    }

    const game = await gameIdBySlug(req, slug)
    if (game == null) {
      return Response.json({ error: 'unknown_game' }, { status: 404 })
    }

    const season = currentSeason()
    const { adjIdx, nounIdx } = nameIndices(seed, slug)
    const alias = `${ADJ_EN[adjIdx]} ${NOUN_EN[nounIdx]}`

    // — Дедуп: одна строка на (game, adjIdx, nounIdx, board, season), храним максимум.
    const existing = await req.payload.find({
      collection: 'game-scores',
      where: {
        game: { equals: game },
        adjIdx: { equals: adjIdx },
        nounIdx: { equals: nounIdx },
        board: { equals: board },
        season: { equals: season },
      },
      limit: 1,
      depth: 0,
    })
    const prev = existing.docs[0]
    let best = score
    if (prev) {
      best = Math.max(prev.score as number, score)
      if (score > (prev.score as number)) {
        await req.payload.update({ collection: 'game-scores', id: prev.id, data: { score, durationMs } })
      }
    } else {
      await req.payload.create({
        collection: 'game-scores',
        data: { game, alias, adjIdx, nounIdx, score, durationMs, board, season },
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

    return Response.json({
      adj: adjIdx,
      noun: nounIdx,
      board,
      season,
      score: best,
      submitted: score,
      improved: !prev || score > (prev.score as number),
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

    const game = slug ? await gameIdBySlug(req, slug) : null
    if (game == null) {
      return Response.json({ board, season, total: 0, page: pageNum, hasMore: false, top: [] })
    }
    const res = await page(req, game, board, season, pageNum, limit)
    return Response.json({ board, season, ...res })
  },
}
