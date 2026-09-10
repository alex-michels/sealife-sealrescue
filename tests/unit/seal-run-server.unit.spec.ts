import { beforeAll, describe, expect, it } from 'vitest'
import { runIdentity, runRoundsSchema, validateRun, type RunRound } from '@/games/sealRun'
import { generateRound } from '../../public/games/seal-run-v1/core/course.js'
import { computeScore } from '../../public/games/seal-run-v1/core/balance.js'

type Bot = {
  runBot: (
    course: unknown,
    profile: { reactMs: number },
  ) => RunRound & { score: number; phase: string; finished: boolean }
}
let bot: Bot
beforeAll(async () => {
  bot = (await import(
    new URL('../../public/games/seal-run-v1/tools/bot-lib.mjs', import.meta.url).href
  )) as Bot
})
const fields = (r: RunRound): RunRound => ({
  distanceM: r.distanceM,
  fishCollected: r.fishCollected,
  fishPoints: r.fishPoints,
  livesRemaining: r.livesRemaining,
  durationMs: r.durationMs,
})

describe('SR-09/10/20: runner score contract', () => {
  it('accepts real fixed-step runs for every chapter, summing only consecutive finishes', () => {
    for (const season of ['2026-W01', '2026-W36', '2027-W01']) {
      const rounds: RunRound[] = []
      for (let index = 0; index < 5; index++) {
        const result = bot.runBot(generateRound(season, index), { reactMs: 160 })
        rounds.push(fields(result))
        expect(runRoundsSchema.safeParse(rounds).success).toBe(true)
        const score = rounds.reduce(
          (sum, r) => sum + computeScore(r.distanceM, r.fishPoints, r.livesRemaining),
          0,
        )
        const duration = rounds.reduce((sum, r) => sum + r.durationMs, 0)
        expect(validateRun(rounds, season, score, duration)).toMatchObject({
          levelsCompleted: rounds.filter((r) => r.distanceM === 900).length,
        })
        expect(score).toBeLessThanOrEqual(500_000)
        if (!result.finished) break
      }
    }
  })
  it('rejects inflated score, impossible speed, fish budgets and unfinished intermediate chapters', () => {
    const season = '2026-W01',
      r = fields(bot.runBot(generateRound(season, 0), { reactMs: 160 }))
    const score = computeScore(r.distanceM, r.fishPoints, r.livesRemaining)
    expect(validateRun([r], season, score + 1, r.durationMs)).toBeNull()
    expect(validateRun([{ ...r, durationMs: 3000 }], season, score, 3000)).toBeNull()
    const fake = { ...r, fishCollected: 400, fishPoints: 400 }
    expect(
      validateRun(
        [fake],
        season,
        computeScore(fake.distanceM, 400, fake.livesRemaining),
        fake.durationMs,
      ),
    ).toBeNull()
    expect(
      validateRun([{ ...r, distanceM: 899 }, r], season, score * 2, r.durationMs * 2),
    ).toBeNull()
    expect(
      validateRun([{ ...r, fishPoints: r.fishCollected + 1 }], season, score, r.durationMs),
    ).toBeNull()
    expect(validateRun([r], season, score, r.durationMs + 20)).toBeNull()
  })
  it('bounds chapter count, fields and score inputs before validation', () => {
    expect(runRoundsSchema.safeParse([]).success).toBe(false)
    expect(runRoundsSchema.safeParse(Array(6).fill({})).success).toBe(false)
    expect(
      runRoundsSchema.safeParse([
        { distanceM: 901, fishCollected: 0, fishPoints: 0, livesRemaining: 3, durationMs: 90000 },
      ]).success,
    ).toBe(false)
  })
})

describe('SR-11: functional identity', () => {
  it('creates nothing on read, signs a restricted cookie on explicit start, and rotates the weekly alias', () => {
    expect(runIdentity(new Headers(), '2026-W01')).toBeNull()
    const identity = runIdentity(new Headers(), '2026-W01', true)!
    expect(identity.cookie).toContain('HttpOnly; SameSite=Lax')
    expect(identity.cookie).toContain('Path=/api/leaderboard; Max-Age=604800')
    const headers = new Headers({ cookie: identity.cookie!.split(';')[0] })
    expect(runIdentity(headers, '2026-W01')).toEqual({ seed: identity.seed, cookie: undefined })
    expect(runIdentity(headers, '2026-W02')!.seed).not.toBe(identity.seed)
    expect(
      runIdentity(
        new Headers({ cookie: 'seal_run_player=' + 'a'.repeat(32) + '.' + '0'.repeat(64) }),
        '2026-W01',
      ),
    ).toBeNull()
  })
})

describe('SR-17/18/19: all biomes retain route and visual-motion invariants', () => {
  it('lints all 100 templates and chapter geometry at the fastest chapter speed', async () => {
    const chunks = (await import(
      new URL('../../public/games/seal-run-v1/core/chunks/biomes.js', import.meta.url).href
    )) as { ALL_CHUNKS: unknown[] }
    const lint = (await import(
      new URL('../../public/games/seal-run-v1/tools/chunk-lint-lib.mjs', import.meta.url).href
    )) as { runLint: (chunks: unknown[], seeds: string[]) => string[] }
    expect(chunks.ALL_CHUNKS).toHaveLength(100)
    expect(lint.runLint(chunks.ALL_CHUNKS, ['2026-W01', '2026-W14', '2026-W52'])).toEqual([])
  })
  it('fish bob is bounded, reproducible and leaves pickup coordinates untouched', async () => {
    const { fishBob } = (await import(
      new URL('../../public/games/seal-run-v1/render/motion.js', import.meta.url).href
    )) as {
      fishBob: (
        fish: { x: number; y: number; type: string },
        time: number,
        reduced?: boolean,
      ) => number
    }
    const fish = Object.freeze({ x: 1500, y: 270, type: 'fish_rare' })
    for (let time = 0; time < 10000; time += 113) {
      expect(Math.abs(fishBob(fish, time))).toBeLessThanOrEqual(8)
      expect(fishBob(fish, time)).toBe(fishBob(fish, time))
      expect(fishBob(fish, time, true)).toBe(0)
    }
    expect(fish.y).toBe(270)
  })
})
