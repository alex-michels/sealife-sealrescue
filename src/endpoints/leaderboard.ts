import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'

/**
 * Server-authoritative лидерборд (SH-06). Публичный клиент НЕ пишет в БД напрямую —
 * только через эти endpoints, которые валидируют ввод (Zod), режут неправдоподобные
 * результаты (анти-чит) и сами генерируют курируемый псевдоним. PII не хранится:
 * IP используется только для transient rate-limit (в памяти), в БД не попадает.
 *
 *  POST /api/leaderboard   — отправить результат, вернуть ранг + топ
 *  GET  /api/leaderboard   — прочитать доску (?game=&board=)
 */

// — Курируемые слова: псевдоним = f(seed). Свободного текста нет → нет UGC/премодерации.
const ADJ = [
  'Brave', 'Sleepy', 'Cosy', 'Plucky', 'Salty', 'Misty', 'Sunny', 'Chubby',
  'Swift', 'Gentle', 'Jolly', 'Bold', 'Lucky', 'Mellow', 'Nimble', 'Quiet',
  'Round', 'Shiny', 'Snug', 'Spry', 'Tidal', 'Wavy', 'Zippy', 'Pebbly',
]
const NOUN = [
  'Seal', 'Otter', 'Walrus', 'Puffin', 'Cormorant', 'Kelp', 'Pebble', 'Buoy',
  'Wave', 'Tide', 'Cove', 'Skerry', 'Fjord', 'Selkie', 'Sprat', 'Herring',
  'Anchovy', 'Flipper', 'Whisker', 'Bubble', 'Dune', 'Reef', 'Shrimp', 'Beacon',
]

function aliasFromSeed(seed: number): string {
  const a = ADJ[seed % ADJ.length]
  const n = NOUN[Math.floor(seed / ADJ.length) % NOUN.length]
  return `${a} ${n}`
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
function rateLimited(ip: string, limit = 20, windowMs = 60_000): boolean {
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
  seed: z.number().int().min(0).max(1_000_000_000),
})

const TOP_N = 20

async function gameIdBySlug(req: PayloadRequest, slug: string): Promise<number | null> {
  const { docs } = await req.payload.find({
    collection: 'games',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  return docs[0] ? (docs[0].id as number) : null
}

async function topFor(req: PayloadRequest, game: number, board: 'desktop' | 'mobile', season: string) {
  const where = { game: { equals: game }, board: { equals: board }, season: { equals: season } }
  const [list, count] = await Promise.all([
    req.payload.find({ collection: 'game-scores', where, sort: '-score', limit: TOP_N, depth: 0 }),
    req.payload.count({ collection: 'game-scores', where }),
  ])
  const top = list.docs.map((d, i) => ({ rank: i + 1, alias: d.alias as string, score: d.score as number }))
  return { top, total: count.totalDocs }
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
    const alias = aliasFromSeed(seed)

    await req.payload.create({
      collection: 'game-scores',
      data: { game, alias, score, durationMs, board, season },
    })

    const where = { game: { equals: game }, board: { equals: board }, season: { equals: season } }
    const better = await req.payload.count({
      collection: 'game-scores',
      where: { ...where, score: { greater_than: score } },
    })
    const rank = better.totalDocs + 1
    const { top, total } = await topFor(req, game, board, season)
    const percentile = total > 0 ? Math.max(1, Math.round((rank / total) * 100)) : 100

    return Response.json({ alias, board, season, score, rank, total, percentile, top })
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
    const season = currentSeason()

    const game = slug ? await gameIdBySlug(req, slug) : null
    if (game == null) {
      return Response.json({ board, season, total: 0, top: [] })
    }
    const { top, total } = await topFor(req, game, board, season)
    return Response.json({ board, season, total, top })
  },
}
