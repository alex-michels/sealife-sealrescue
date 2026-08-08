import { describe, it, beforeAll, afterAll, expect } from 'vitest'

/**
 * QA-31: fairness-регрессия — сокращённый прогон харнесса в CI с ассертом порогов.
 * Полный прогон (16 профилей × 60+ раундов) — вручную при изменении баланса:
 *   node public/games/seal-hunt-v1/tools/fairness-sim.mjs 60
 *
 * Базлайн (2026-07-03, SH-12 фикс. поле + SH-13 звезда, бафф 3 c, seed 0, N=80): все
 * ландшафты байт-идентичны (94.0), все портреты (94.2) — миров всего два; разброс по всем
 * 16 профилям 0.2% (остаточная разница форм 16:9 vs 9:16; звезда orientation-fair: CRN даёт
 * один и тот же roll/момент/ОТНОСИТЕЛЬНУЮ позицию на всех профилях). История: кламп 2:1 —
 * 5.5%; SH-12 без звезды — 0.8%; бафф 2 c — 0.4%. Пороги 5/3 — ловят РЕАЛЬНЫЙ перекос, не шум.
 */

type FairnessLib = {
  PROFILES: Array<{ name: string; w: number; h: number }>
  installSeededRandom: (base?: number) => { seedRound: (i: number) => void; restore: () => void }
  runRound: (world: unknown) => number
}
type BalanceLib = {
  VIEW_CFG: { aspect: number }
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
const MAX_SPREAD_PCT = 5 // базлайн SH-12: 0.8% (только 16:9-поле vs 9:16-поле)
const MAX_PROFILE_DEVIATION_PCT = 3 // при двух мирах отклонение ≈ половина разброса

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
  it('поле фиксировано — 16:9 / 9:16 (SH-12, сменило кламп 2:1 из PR #25/#26)', () => {
    expect(balance.VIEW_CFG.aspect).toBeCloseTo(16 / 9, 9)
    for (const p of lib.PROFILES) {
      const world = balance.computeWorld(p.w, p.h)
      // Экран поле НЕ меняет: у всех ландшафтов идентичный мир, у всех портретов идентичный.
      if (p.w >= p.h) expect(world, p.name).toEqual({ w: 960, h: 540 })
      else expect(world, p.name).toEqual({ w: 540, h: 960 })
    }
  })

  /*
   * 6 профилей × 12 раундов × 3600 тиков ≈ 6 с — дольше дефолтных 5 с vitest.
   *
   * ⚠️ Бюджет 30 с не выдерживал `--coverage`: под инструментацией v8 тот же прогон занимает
   * ~40 с, и `npm run test:coverage` (пред-коммитный гейт и CI) падал по ТАЙМАУТУ — не по
   * балансу. Проверено на чистом дереве: воспроизводится без каких-либо правок рядом.
   * Само утверждение о разбросе не тронуто, изменён только запас по времени.
   */
  it(`catch-rate ровный: разброс ≤ ${MAX_SPREAD_PCT}%, каждый профиль в ±${MAX_PROFILE_DEVIATION_PCT}% от среднего`, { timeout: 120_000 }, () => {
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
