import { describe, it, beforeAll, afterAll, expect } from 'vitest'

/**
 * QA-31: fairness-регрессия — сокращённый прогон харнесса в CI с ассертом порогов.
 * Полный прогон (16 профилей × 60+ раундов) — вручную при изменении баланса:
 *   node public/games/seal-hunt-v1/tools/fairness-sim.mjs 60
 *
 * Базлайн (2026-07-03, seed 0, N=12, после фикса resetSpawnState): разброс по всем
 * 16 профилям 5.5% (min 91.5, max 96.7). До фикса carry-over edgeBag добавлял
 * ложный шум (9.3%). Пороги с запасом: они ловят РЕАЛЬНЫЙ перекос баланса
 * (изменение механики/кламп-конфига), не шум — прогон seeded и детерминирован.
 */

type FairnessLib = {
  PROFILES: Array<{ name: string; w: number; h: number }>
  installSeededRandom: (base?: number) => { seedRound: (i: number) => void; restore: () => void }
  runRound: (world: unknown) => number
}
type BalanceLib = {
  VIEW_CFG: { maxAspect: number }
  computeWorld: (w: number, h: number) => { w: number; h: number }
  recomputeBalance: (w: number, h: number) => void
}

// Представительный срез: оба хвоста базлайна (tablet 3:4 — минимум, desktop 16:9 —
// максимум) + мобильный портрет, экстремально-вытянутый, ноутбук и 32:9-ультравайд.
const SUBSET = [
  'phone        9:16  ',
  'extra-tall   9:21  ',
  'tablet      3:4    ',
  'laptop      16:9   ',
  'desktop FHD 16:9   ',
  'super-ultra 32:9   ',
]
const ROUNDS = 12
const MAX_SPREAD_PCT = 15 // базлайн 9.3% по всем профилям
const MAX_PROFILE_DEVIATION_PCT = 10 // худшее отклонение от среднего в базлайне ~6.4%

let lib: FairnessLib
let balance: BalanceLib
let rng: ReturnType<FairnessLib['installSeededRandom']>

beforeAll(async () => {
  lib = (await import(
    new URL('../../public/games/seal-hunt-v1/tools/fairness-lib.mjs', import.meta.url).href
  )) as FairnessLib
  balance = (await import(
    new URL('../../public/games/seal-hunt-v1/core/balance.js', import.meta.url).href
  )) as BalanceLib
  rng = lib.installSeededRandom(0)
})

afterAll(() => rng?.restore())

describe('fairness across screen profiles', () => {
  it('кламп поля — 2:1 (осознанное решение PR #25/#26) и держится на всех профилях', () => {
    expect(balance.VIEW_CFG.maxAspect).toBe(2)
    for (const p of lib.PROFILES) {
      const world = balance.computeWorld(p.w, p.h)
      const aspect = Math.max(world.w, world.h) / Math.min(world.w, world.h)
      expect(aspect, p.name).toBeLessThanOrEqual(2 + 1e-9)
    }
  })

  // 6 профилей × 12 раундов × 3600 тиков ≈ 6 с — дольше дефолтных 5 с vitest.
  it(`catch-rate ровный: разброс ≤ ${MAX_SPREAD_PCT}%, каждый профиль в ±${MAX_PROFILE_DEVIATION_PCT}% от среднего`, { timeout: 30_000 }, () => {
    const profiles = SUBSET.map((name) => {
      const p = lib.PROFILES.find((x) => x.name === name)
      expect(p, `профиль «${name}» пропал из харнесса`).toBeDefined()
      return p!
    })

    const means = profiles.map((p) => {
      const world = balance.computeWorld(p.w, p.h)
      balance.recomputeBalance(world.w, world.h)
      let total = 0
      for (let i = 0; i < ROUNDS; i++) {
        rng.seedRound(i) // common random numbers: раунд i одинаков на всех профилях
        total += lib.runRound(world)
      }
      return { name: p.name.trim(), mean: total / ROUNDS }
    })

    const values = means.map((m) => m.mean)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const spreadPct = ((Math.max(...values) - Math.min(...values)) / avg) * 100

    expect(
      spreadPct,
      `разброс ${spreadPct.toFixed(1)}% — баланс перекосило: ${JSON.stringify(means)}`,
    ).toBeLessThanOrEqual(MAX_SPREAD_PCT)

    for (const m of means) {
      const devPct = (Math.abs(m.mean - avg) / avg) * 100
      expect(
        devPct,
        `${m.name}: ${m.mean.toFixed(1)} против среднего ${avg.toFixed(1)} (${devPct.toFixed(1)}%)`,
      ).toBeLessThanOrEqual(MAX_PROFILE_DEVIATION_PCT)
    }
  })
})
