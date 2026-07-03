import { describe, it, beforeAll, expect } from 'vitest'

/**
 * Контракты краевой механики добычи Seal The Hunter (entities/prey.js) — «рыба у границы
 * возвращается, а не утекает» (гибрид PR #26). Дополняет golden (QA-30, агрегатное поведение)
 * и визуальные контракты (tests/e2e/game-visual-borders.e2e.spec.ts): здесь зафиксированы
 * ЧИСЛА, на которых стоят и честность (edge-push держит плотность), и рендер-фейд
 * (EDGE_FADE_LU 38 < cull 40 — рыба растворяется ДО удаления симом).
 *
 * updatePrey детерминирован (wander — sin/cos от phase, без RNG); RNG нужен только spawnPrey —
 * сидится подменой Math.random (mulberry32, как в tools/fairness-lib.mjs).
 */

type Fish = {
  x: number
  y: number
  px: number
  py: number
  vx: number
  vy: number
  r: number
  t: number
  dir: number
  phase: number
  fleeT: number
  restT: number
  tailKick: number
  sp: { wiggle: (f: unknown, dt: number, i: number) => void; variant?: string }
}
type PreyModule = {
  PREY: Fish[]
  resetSpawnState: () => void
  spawnPrey: (world: { w: number; h: number }, n?: number) => void
  updatePrey: (
    dt: number,
    seal: { x: number; y: number; r: number },
    world: { w: number; h: number },
    eatCb: () => void,
  ) => void
}

let prey: PreyModule

const WORLD = { w: 960, h: 540 }
const SEAL_FAR = { x: 100000, y: 100000, r: 34 } // вне threat-радиуса: бегство не триггерится
const DT = 1 / 60

function makeFish(x: number, y: number, vx: number, vy: number): Fish {
  return {
    x, y, px: x, py: y, vx, vy,
    r: 18, t: 0, dir: Math.sign(vx) || 1, phase: 0.4,
    fleeT: 0, restT: 0, tailKick: 0,
    sp: { wiggle: () => {}, variant: 'round' },
  }
}

function withSeededRandom<T>(seed: number, fn: () => T): T {
  const original = Math.random
  let s = seed >>> 0
  Math.random = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  try {
    return fn()
  } finally {
    Math.random = original
  }
}

beforeAll(async () => {
  prey = (await import(
    new URL('../../public/games/seal-hunt-v1/entities/prey.js', import.meta.url).href
  )) as PreyModule
})

describe('спавн: 4-edge shuffle-bag, вход строго снаружи и строго внутрь', () => {
  it('первые 4 спавна закрывают все 4 края; позиция ±20 за краем; скорость — внутрь', () => {
    prey.PREY.length = 0
    prey.resetSpawnState()
    withSeededRandom(42, () => prey.spawnPrey(WORLD, 4))
    expect(prey.PREY.length).toBe(4)

    const edges = new Set<string>()
    for (const f of prey.PREY) {
      if (f.x === -20) { edges.add('left'); expect(f.vx, 'left-спавн плывёт вправо').toBeGreaterThan(0) }
      else if (f.x === WORLD.w + 20) { edges.add('right'); expect(f.vx, 'right-спавн плывёт влево').toBeLessThan(0) }
      else if (f.y === -20) { edges.add('top'); expect(f.vy, 'top-спавн плывёт вниз').toBeGreaterThan(0) }
      else if (f.y === WORLD.h + 20) { edges.add('bottom'); expect(f.vy, 'bottom-спавн плывёт вверх').toBeLessThan(0) }
      else expect.unreachable(`спавн не на краю: (${f.x}, ${f.y})`)
    }
    // shuffle-bag: полная сумка = каждый край ровно один раз (равномерность — основа честности)
    expect(edges.size).toBe(4)
  })
})

describe('edge-push: рыба у границы разворачивается назад (все 4 стороны)', () => {
  const cases = [
    { name: 'left', fish: () => makeFish(20, 270, -120, 0), axis: 'x' as const, lowEdge: true },
    { name: 'right', fish: () => makeFish(WORLD.w - 20, 270, 120, 0), axis: 'x' as const, lowEdge: false },
    { name: 'top', fish: () => makeFish(480, 20, 0, -120), axis: 'y' as const, lowEdge: true },
    { name: 'bottom', fish: () => makeFish(480, WORLD.h - 20, 0, 120), axis: 'y' as const, lowEdge: false },
  ]

  for (const c of cases) {
    it(`${c.name}: не за кулл-порог (±40), возвращается в поле, не удаляется`, () => {
      prey.PREY.length = 0
      prey.PREY.push(c.fish())
      const dimMax = c.axis === 'x' ? WORLD.w : WORLD.h

      let worstOver = 0
      for (let i = 0; i < Math.round(3 / DT); i++) {
        prey.updatePrey(DT, SEAL_FAR, WORLD, () => {})
        expect(prey.PREY.length, `тик ${i}: рыбу срезал кулл`).toBe(1)
        const v = prey.PREY[0][c.axis]
        const over = c.lowEdge ? -v : v - dimMax
        worstOver = Math.max(worstOver, over)
      }
      // Мягкий edge-push (margin 42, steer 180) может пустить чуть за край, но НИКОГДА до
      // кулла ±40 при обычной крейсерской скорости — иначе рыба «моргала» бы у границ.
      expect(worstOver).toBeLessThan(40)
      const end = prey.PREY[0][c.axis]
      expect(end, 'к концу окна рыба снова в поле').toBeGreaterThan(0)
      expect(end).toBeLessThan(dimMax)
    })
  }
})

describe('safety-cull: строго за пределами ±40 (страховка, а не механика удержания)', () => {
  it('рыба на −39 живёт; на −45 удаляется; NaN удаляется', () => {
    prey.PREY.length = 0
    prey.PREY.push(makeFish(-39, 270, 0, 0))
    prey.updatePrey(DT, SEAL_FAR, WORLD, () => {})
    expect(prey.PREY.length, 'внутри кулл-маржи (>-40) рыба живёт').toBe(1)

    prey.PREY.length = 0
    prey.PREY.push(makeFish(-45, 270, 0, 0))
    prey.updatePrey(DT, SEAL_FAR, WORLD, () => {})
    expect(prey.PREY.length, 'за куллом (−45) рыба удалена').toBe(0)

    prey.PREY.length = 0
    prey.PREY.push(makeFish(NaN, 270, 0, 0))
    prey.updatePrey(DT, SEAL_FAR, WORLD, () => {})
    expect(prey.PREY.length, 'NaN-позиция удалена').toBe(0)
  })
})
