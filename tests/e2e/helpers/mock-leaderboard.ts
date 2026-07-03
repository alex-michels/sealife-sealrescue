import type { Page, Route } from '@playwright/test'

/**
 * Generic, DB-free mock for the anonymous leaderboard API used by the Seal The Hunter game
 * client (`public/games/seal-hunt-v1/core/leaderboard.js`). Reusable by any leaderboard e2e —
 * scroll-to-player, tie ranks, pagination — instead of a live Payload/DB.
 *
 * It fulfils the three endpoints the client talks to (single board — the desktop/mobile
 * split was removed 2026-07-03):
 *   • GET  /api/leaderboard/start?game=      → { token }            (anti-cheat play-token)
 *   • POST /api/leaderboard                   → the player's standing + page 1   (submitScore)
 *   • GET  /api/leaderboard?game=&page=       → one page of rows                 (fetchPage)
 *
 * Rows are generated deterministically 1..total. The player's row (at `rank`) carries `alias`,
 * which the POST response echoes so the client marks it `.lb-row.me`. `makeRow` lets a caller
 * override any row (e.g. inject a tie above the player).
 */

/** One row as core/leaderboard.js expects it (see rowHtml/render). */
export interface MockLbRow {
  rank: number
  /** Name part indices for renderName(); `noun` is required, the rest optional. */
  parts: { noun: number; adj?: number; mod?: number; pref?: number; suf?: number }
  suffix?: number
  alias: string
  score: number
}

export interface LeaderboardMockOptions {
  /** Total players on the board. Default 120. */
  total?: number
  /** The submitting player's rank (1-based). Default 40 (mid page 1 → needs scrolling). */
  rank?: number
  /** The player's canonical alias — used to build the highlighted `.me` row. Default 'me-alias'. */
  alias?: string
  /** Server page size — MUST match PAGE_SIZE in core/leaderboard.js (50). Default 50. */
  pageSize?: number
  /** Weekly reset timestamp (ISO). Default: now + 3 days. */
  resetAt?: string
  /** Override a generated row (e.g. to force a tie). */
  makeRow?: (rank: number, base: MockLbRow) => MockLbRow
}

export interface LeaderboardMock {
  total: number
  rank: number
  alias: string
  pageSize: number
  percentile: number
  resetAt: string
}

export async function installLeaderboardMock(
  page: Page,
  options: LeaderboardMockOptions = {},
): Promise<LeaderboardMock> {
  const total = options.total ?? 120
  const rank = options.rank ?? 40
  const alias = options.alias ?? 'me-alias'
  const pageSize = options.pageSize ?? 50
  const resetAt = options.resetAt ?? new Date(Date.now() + 3 * 864e5).toISOString()
  const percentile = Math.max(1, Math.round((rank / total) * 100))

  const row = (r: number): MockLbRow => {
    const base: MockLbRow = {
      rank: r,
      parts: { noun: r % 30 }, // any valid NOUN index → renderName() renders a name, never throws
      alias: r === rank ? alias : `p${r}`,
      score: Math.max(0, 1000 - r * 3),
    }
    return options.makeRow ? options.makeRow(r, base) : base
  }
  const pageRows = (pageNum: number): MockLbRow[] => {
    const start = (pageNum - 1) * pageSize + 1
    const end = Math.min(pageNum * pageSize, total)
    const out: MockLbRow[] = []
    for (let r = start; r <= end; r++) out.push(row(r))
    return out
  }
  const hasMore = (pageNum: number): boolean => pageNum * pageSize < total
  const standing = (pageNum: number) => ({
    alias,
    rank,
    total,
    percentile,
    resetAt,
    top: pageRows(pageNum),
    page: pageNum,
    hasMore: hasMore(pageNum),
  })

  await page.route(/\/api\/leaderboard/, (route: Route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (url.pathname.endsWith('/leaderboard/start')) {
      return route.fulfill({ json: { token: 'test-play-token' } })
    }
    if (req.method() === 'POST') {
      return route.fulfill({ json: standing(1) }) // submitScore → player standing + page 1
    }
    const pageNum = Number(url.searchParams.get('page') || '1')
    return route.fulfill({
      json: { total, resetAt, top: pageRows(pageNum), page: pageNum, hasMore: hasMore(pageNum) },
    })
  })

  return { total, rank, alias, pageSize, percentile, resetAt }
}
