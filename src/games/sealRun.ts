import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import {
  generateRound,
  fishCountBudget,
  fishPointsBudget,
  LU_PER_M,
  FISH_REACH_SLACK_LU,
} from '../../public/games/seal-run-v1/core/course.js'
import { BAL, computeScore } from '../../public/games/seal-run-v1/core/balance.js'
import { MAX_ROUNDS, RULES_VERSION } from '../../public/games/seal-run-v1/core/biomes.js'

export { RULES_VERSION }
export const runRoundSchema = z.strictObject({
  distanceM: z.number().int().min(0).max(900),
  fishCollected: z.number().int().min(0).max(400),
  fishPoints: z.number().int().min(0).max(400),
  livesRemaining: z.number().int().min(0).max(3),
  durationMs: z.number().int().min(0).max(150_010),
})
export const runRoundsSchema = z.array(runRoundSchema).min(1).max(MAX_ROUNDS)
export type RunRound = z.infer<typeof runRoundSchema>

/** Exact derived score, per-round course budgets and physical bounds; not an input replay. */
export function validateRun(rounds: RunRound[], season: string, score: number, durationMs: number) {
  let derived = 0,
    duration = 0,
    distance = 0,
    fishCollected = 0,
    levelsCompleted = 0
  for (const [index, round] of rounds.entries()) {
    const course = generateRound(season, index)
    const d = round.distanceM * LU_PER_M
    if (index < rounds.length - 1 && (round.distanceM !== 900 || round.livesRemaining === 0))
      return null
    if (round.distanceM === 900 && round.livesRemaining === 0) return null
    const fastest =
      BAL.SPEED_MAX * BAL.FISH_SPEED_BUFF_MULT * BAL.BURST_MULT * (course.speedMultiplier ?? 1)
    if (round.durationMs + 100 < (d / fastest) * 1000 || round.durationMs < 3000) return null
    const reachable = course.fish.filter((f) => f.atLu <= d + FISH_REACH_SLACK_LU)
    const rare = reachable.filter((f) => f.points === 4).length
    const small = reachable.length - rare
    const rareCaught = (round.fishPoints - round.fishCollected) / 3
    if (
      !Number.isInteger(rareCaught) ||
      rareCaught < 0 ||
      rareCaught > rare ||
      round.fishCollected - rareCaught < 0 ||
      round.fishCollected - rareCaught > small ||
      round.fishCollected > fishCountBudget(course, d) ||
      round.fishPoints > fishPointsBudget(course, d)
    )
      return null
    derived += computeScore(round.distanceM, round.fishPoints, round.livesRemaining)
    duration += round.durationMs
    distance += round.distanceM
    fishCollected += round.fishCollected
    if (round.distanceM === 900) levelsCompleted++
  }
  if (score !== derived || Math.abs(durationMs - duration) > 5) return null
  return {
    distance,
    fishCollected,
    livesRemaining: rounds.at(-1)!.livesRemaining,
    levelsCompleted,
    courseSeed: `${RULES_VERSION}:${season}`,
  }
}

const COOKIE = 'seal_run_player'
function mac(value: string) {
  return createHmac('sha256', process.env.PAYLOAD_SECRET || 'seal-dev-secret')
    .update(`seal-run-player:${value}`)
    .digest('hex')
}

/** A functional game cookie is issued only after the player chooses the weekly expedition. */
export function runIdentity(headers: Headers, season: string, create = false) {
  const value = headers
    .get('cookie')
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  let id: string | undefined
  if (value && /^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value)) {
    const [candidate, signature] = value.split('.')
    if (timingSafeEqual(Buffer.from(signature), Buffer.from(mac(candidate)))) id = candidate
  }
  let cookie: string | undefined
  if (!id && create) {
    id = randomBytes(16).toString('hex')
    cookie = `${COOKIE}=${id}.${mac(id)}; Path=/api/leaderboard; Max-Age=604800; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  }
  if (!id) return null
  const seed = createHash('sha256').update(`${id}:${season}`).digest().readUInt32BE(0)
  return { seed, cookie }
}
