import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'

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
function makeParts(seed: number, game: string): NameParts {
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

/** Канонический EN-рендер (ключ дедупа + подпись в админке). */
function renderEn(p: NameParts): string {
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
    alias: d.alias as string,
    parts: d.nameParts as NameParts,
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
    const parts = makeParts(seed, slug)
    const alias = renderEn(parts)

    // — Дедуп: одна строка на (game, alias, board, season), храним максимум.
    const existing = await req.payload.find({
      collection: 'game-scores',
      where: {
        game: { equals: game },
        alias: { equals: alias },
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
        data: { game, alias, nameParts: parts, score, durationMs, board, season },
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
      alias,
      parts,
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
