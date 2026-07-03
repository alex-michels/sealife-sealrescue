import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

/**
 * QA-30: golden run симуляции Seal The Hunter — фиксированный seed → идентичный
 * лог состояний и финальный счёт core/sim.js (+prey.js). Любое изменение физики,
 * спавна или баланса валит тест — и это ФИЧА: golden обновляется ОСОЗНАННО:
 *
 *   UPDATE_GOLDEN=1 npx vitest run --project unit tests/unit/sim-golden.unit.spec.ts
 *
 * (после чего diff golden-файла ревьюится в PR вместе с изменением механики).
 *
 * Позиции квантуются до 1e-3: реальные изменения механики на порядки больше, а
 * микроразличия транscendental-функций между V8-сборками не флачат тест.
 */

type GameToolsLib = {
  TICKS: number
  installSeededRandom: (base?: number) => { seedRound: (i: number) => void; restore: () => void }
  runRound: (world: unknown, onTick?: (i: number, seal: { x: number; y: number }, score: number) => void) => number
}
type BalanceLib = {
  computeWorld: (w: number, h: number) => { w: number; h: number }
  recomputeBalance: (w: number, h: number) => void
}

const GOLDEN_PATH = fileURLToPath(new URL('../golden/seal-hunt-sim.golden.json', import.meta.url))

let lib: GameToolsLib
let balance: BalanceLib
let rng: ReturnType<GameToolsLib['installSeededRandom']>

const q = (v: number) => Math.round(v * 1000) / 1000

/** Трейс раунда: снапшот каждую секунду (каждые 60 тиков) + финальный счёт. */
function captureTrace(seed: number) {
  const world = balance.computeWorld(1920, 1080) // desktop FHD → мир 960×540
  balance.recomputeBalance(world.w, world.h)
  rng.seedRound(seed)
  const samples: Array<{ t: number; x: number; y: number; score: number }> = []
  const finalScore = lib.runRound(world, (i, seal, score) => {
    if ((i + 1) % 60 === 0) samples.push({ t: (i + 1) / 60, x: q(seal.x), y: q(seal.y), score })
  })
  return { profile: 'desktop FHD 1920×1080 → 960×540', seed, quantization: 0.001, finalScore, samples }
}

beforeAll(async () => {
  lib = (await import(
    new URL('../../public/games/seal-hunt-v1/tools/fairness-lib.mjs', import.meta.url).href
  )) as GameToolsLib
  balance = (await import(
    new URL('../../public/games/seal-hunt-v1/core/balance.js', import.meta.url).href
  )) as BalanceLib
  rng = lib.installSeededRandom(0)
})

afterAll(() => rng?.restore())

describe('sim golden run (seed 0, desktop FHD)', () => {
  it('трейс и финальный счёт совпадают с golden-файлом', () => {
    const actual = captureTrace(0)

    if (process.env.UPDATE_GOLDEN) {
      writeFileSync(GOLDEN_PATH, JSON.stringify(actual, null, 2) + '\n')
      console.warn(`golden обновлён: ${GOLDEN_PATH} — закоммить диф осознанно`)
      return
    }

    expect(existsSync(GOLDEN_PATH), 'golden-файл отсутствует — сгенерируй UPDATE_GOLDEN=1').toBe(true)
    const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as ReturnType<typeof captureTrace>
    expect(actual.finalScore, 'финальный счёт разошёлся с golden — механика изменилась?').toBe(
      golden.finalScore,
    )
    expect(actual.samples).toEqual(golden.samples)
  })

  it('детерминизм: два прогона одного seed идентичны бит-в-бит', () => {
    const a = captureTrace(0)
    const b = captureTrace(0)
    expect(a).toEqual(b)
  })

  it('sanity: другой seed даёт другой раунд', () => {
    const a = captureTrace(0)
    const b = captureTrace(1)
    expect(JSON.stringify(a.samples)).not.toBe(JSON.stringify(b.samples))
  })
})
