import { describe, it, beforeAll, expect } from 'vitest'

/**
 * SR-04: headless-бот и харнесс честности Seal Run (tools/bot-lib.mjs).
 * CI держит три свойства измерительного инструмента:
 *   1) детерминизм: (seed, profile) → байт-в-байт один результат;
 *   2) вменяемость: бот проходит существенную часть трассы, результат в физических границах;
 *   3) A/B-механизм BAL: патч реально меняет исход, откат возвращает базлайн.
 * Полный прогон: node public/games/seal-run-v1/tools/fairness-sim.mjs 50
 */

type RunResult = {
  distanceM: number
  fishCollected: number
  fishPoints: number
  livesRemaining: number
  durationMs: number
  score: number
  finished: boolean
}
type BotLib = {
  PROFILES: Array<{ name: string; reactMs: number }>
  runBot: (course: unknown, profile: { reactMs: number }) => RunResult
  seasonSeeds: (n: number) => string[]
}
type CourseLib = { generateCourse: (seed: string) => { fish: unknown[] } }
type BalanceLib = { BAL: { MAX_COURSE_MS: number; SURFACE: { water: { VY_MAX: number } } } }

let bot: BotLib
let courseLib: CourseLib
let bal: BalanceLib

beforeAll(async () => {
  bot = (await import(
    new URL('../../public/games/seal-run-v1/tools/bot-lib.mjs', import.meta.url).href
  )) as BotLib
  courseLib = (await import(
    new URL('../../public/games/seal-run-v1/core/course.js', import.meta.url).href
  )) as CourseLib
  bal = (await import(
    new URL('../../public/games/seal-run-v1/core/balance.js', import.meta.url).href
  )) as BalanceLib
})

describe('SR-04: бот-харнесс', () => {
  it('детерминизм: один (seed, profile) → идентичный результат', () => {
    const course = courseLib.generateCourse('2026-W04') // «тяжёлая» неделя базлайна
    for (const profile of bot.PROFILES) {
      const a = bot.runBot(course, profile)
      const b = bot.runBot(course, profile)
      expect(a).toEqual(b)
    }
  })

  it('вменяемость: существенная дистанция, физические границы, кап очков', () => {
    for (const seed of bot.seasonSeeds(5)) {
      const course = courseLib.generateCourse(seed)
      const r = bot.runBot(course, bot.PROFILES[0])
      expect(r.distanceM, seed).toBeGreaterThanOrEqual(300) // бот — не идеал, но и не утопленник
      expect(r.distanceM, seed).toBeLessThanOrEqual(900)
      expect(r.durationMs, seed).toBeLessThanOrEqual(bal.BAL.MAX_COURSE_MS)
      expect(r.fishCollected, seed).toBeLessThanOrEqual(course.fish.length)
      expect(r.score, seed).toBeLessThanOrEqual(100_000) // Zod-кап SubmitBody
    }
  })

  it('A/B-механизм: патч BAL меняет исход, откат восстанавливает базлайн', () => {
    const course = courseLib.generateCourse('2026-W04')
    const profile = bot.PROFILES[0]
    const baseline = bot.runBot(course, profile)

    const saved = bal.BAL.SURFACE.water.VY_MAX
    try {
      bal.BAL.SURFACE.water.VY_MAX = 60 // «ватное» управление — уклонение ломается
      const crippled = bot.runBot(course, profile)
      expect(crippled).not.toEqual(baseline)
      expect(crippled.distanceM).toBeLessThan(baseline.distanceM)
    } finally {
      bal.BAL.SURFACE.water.VY_MAX = saved
    }
    expect(bot.runBot(course, profile)).toEqual(baseline)
  })
})
