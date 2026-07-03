import { describe, it, beforeAll, expect } from 'vitest'

/**
 * ⚡ SH-13: контракты молниевой морской звезды — редкий бафф-пикап Seal The Hunter.
 * Закрепляют: сид-дисциплину расписания (ровно 4 RNG-броска на раунд НЕЗАВИСИМО от исхода —
 * позиция потока стабильна, golden/fairness = f(seed)), редкость ≈ STAR.chance, максимум 1
 * за раунд, «звезда не убегает», 5 очков через eatCb(f), бафф ×2 в stepSeal и его затухание.
 */

type Fish = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  starT?: number
  sp: { lightning?: boolean; still?: boolean; points?: number; variant?: string }
}
type PreyModule = {
  PREY: Fish[]
  resetSpawnState: () => void
  scheduleStar: (world: { w: number; h: number }) => void
  starTick: (elapsedMs: number) => void
  updatePrey: (
    dt: number,
    seal: { x: number; y: number; r: number; buffT?: number },
    world: { w: number; h: number },
    eatCb: (f?: Fish) => void,
  ) => void
}
type SimModule = {
  stepSeal: (
    seal: Record<string, number>,
    ctrl: { px: number; py: number; active: boolean; kx: number; ky: number },
    dt: number,
    world: { w: number; h: number },
  ) => void
}
type BalanceLib = {
  BAL: { sealSpeed: number; sealAccel: number }
  STAR: {
    chance: number
    windowMs: [number, number]
    lifeMs: number
    points: number
    buffMult: number
    buffSec: number
    inset: number
  }
}

let prey: PreyModule
let sim: SimModule
let bal: BalanceLib

const WORLD = { w: 960, h: 540 }
const DT = 1 / 60

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

/** Раунд с гарантированной звездой: подбираем сид, при котором roll < chance. */
function scheduleGuaranteedStar(): void {
  for (let seed = 1; seed < 500; seed++) {
    prey.resetSpawnState()
    prey.PREY.length = 0
    withSeededRandom(seed, () => prey.scheduleStar(WORLD))
    prey.starTick(60_000) // если запланирована — заспавнится
    if (prey.PREY.length === 1) return
  }
  expect.unreachable('ни один сид из 500 не дал звезду — chance сломан?')
}

beforeAll(async () => {
  prey = (await import(
    new URL('../../public/games/seal-hunt-v1/entities/prey.js', import.meta.url).href
  )) as PreyModule
  sim = (await import(
    new URL('../../public/games/seal-hunt-v1/core/sim.js', import.meta.url).href
  )) as SimModule
  bal = (await import(
    new URL('../../public/games/seal-hunt-v1/core/balance.js', import.meta.url).href
  )) as BalanceLib
})

describe('расписание: сид-дисциплина и редкость', () => {
  it('scheduleStar потребляет РОВНО 4 броска RNG независимо от исхода', () => {
    for (const seed of [1, 2, 3, 7, 42]) {
      let calls = 0
      const original = Math.random
      Math.random = () => {
        calls++
        return (seed * 0.137 + calls * 0.211) % 1 // детерминированная заглушка
      }
      try {
        prey.resetSpawnState()
        prey.scheduleStar(WORLD)
      } finally {
        Math.random = original
      }
      expect(calls, `seed ${seed}: позиция RNG-потока должна быть стабильной`).toBe(4)
    }
  })

  it(`редкость ≈ STAR.chance (${'~10%'}), максимум 1 звезда за раунд`, () => {
    let spawned = 0
    const rounds = 400
    for (let seed = 0; seed < rounds; seed++) {
      prey.resetSpawnState()
      prey.PREY.length = 0
      withSeededRandom(seed * 7919 + 3, () => prey.scheduleStar(WORLD))
      prey.starTick(60_000)
      prey.starTick(60_000) // повторный тик НЕ спавнит вторую
      expect(prey.PREY.length).toBeLessThanOrEqual(1)
      spawned += prey.PREY.length
    }
    const rate = spawned / rounds
    // биномиальный допуск вокруг 0.10 (sd ≈ 0.015 при n=400 → ±4sd)
    expect(rate).toBeGreaterThan(bal.STAR.chance - 0.06)
    expect(rate).toBeLessThan(bal.STAR.chance + 0.06)
  })

  it('спавн в срок и внутри inset-границ; сущность = 5 очков, lightning, still', () => {
    scheduleGuaranteedStar()
    const star = prey.PREY[0]
    expect(star.sp.lightning).toBe(true)
    expect(star.sp.still).toBe(true)
    expect(star.sp.points).toBe(bal.STAR.points)
    expect(bal.STAR.points).toBe(5) // решение владельца: 5 вместо 1
    expect(star.x).toBeGreaterThanOrEqual(bal.STAR.inset)
    expect(star.x).toBeLessThanOrEqual(WORLD.w - bal.STAR.inset)
    expect(star.y).toBeGreaterThanOrEqual(bal.STAR.inset)
    expect(star.y).toBeLessThanOrEqual(WORLD.h - bal.STAR.inset)
  })

  it('до назначенного момента звезды нет (starTick до atMs — no-op)', () => {
    // При windowMs[0] = 10с тика на 5с недостаточно для спавна ни при каком сиде.
    for (let seed = 1; seed < 60; seed++) {
      prey.resetSpawnState()
      prey.PREY.length = 0
      withSeededRandom(seed, () => prey.scheduleStar(WORLD))
      prey.starTick(bal.STAR.windowMs[0] - 1000)
      expect(prey.PREY.length).toBe(0)
    }
  })
})

describe('поведение звезды в раунде', () => {
  const SEAL_FAR = { x: 100000, y: 100000, r: 34 }

  it('не убегает от тюленя (still): позиция стабильна при близком тюлене', () => {
    scheduleGuaranteedStar()
    const star = prey.PREY[0]
    const x0 = star.x
    // тюлень рядом, но вне радиуса поимки (eatR = r + seal.r*0.9 ≈ 48)
    const seal = { x: star.x + 70, y: star.y, r: 34, buffT: 0 }
    for (let i = 0; i < Math.round(1.5 / DT); i++) prey.updatePrey(DT, seal, WORLD, () => {})
    expect(prey.PREY.length, 'звезда не убежала и не удалилась').toBe(1)
    expect(Math.abs(prey.PREY[0].x - x0), 'по X звезда стоит на месте').toBeLessThan(1)
  })

  it('истекает через STAR.lifeMs и исчезает (окно возможности)', () => {
    scheduleGuaranteedStar()
    const ticks = Math.round((bal.STAR.lifeMs / 1000 + 0.5) / DT)
    for (let i = 0; i < ticks; i++) prey.updatePrey(DT, SEAL_FAR, WORLD, () => {})
    expect(prey.PREY.length).toBe(0)
  })

  it('поимка: eatCb получает звезду (5 очков), бафф ×2 на STAR.buffSec применён к тюленю', () => {
    scheduleGuaranteedStar()
    const star = prey.PREY[0]
    const seal = { x: star.x, y: star.y, px: star.x, py: star.y, r: 34, buffT: 0 }
    let caught: Fish | undefined
    prey.updatePrey(DT, seal as never, WORLD, (f) => { caught = f })
    expect(caught, 'звезда поймана').toBeDefined()
    expect(caught!.sp.points).toBe(5)
    expect(seal.buffT, 'бафф скорости взведён симом').toBe(bal.STAR.buffSec)
    expect(prey.PREY.length).toBe(0)
  })
})

describe('бафф ×2 в stepSeal (общее ядро игры и харнесса)', () => {
  it('под баффом тюлень разгоняется выше обычного потолка; бафф затухает к buffSec', () => {
    const mk = () => ({
      x: 100, y: 270, px: 100, py: 270, vx: 0, vy: 0, r: 34,
      maxSpeed: bal.BAL.sealSpeed, accel: bal.BAL.sealAccel, buffT: 0,
    })
    const ctrl = { px: 100000, py: 270, active: true, kx: 0, ky: 0 } // далёкая цель → полный ход

    // без баффа: скорость ≤ обычного потолка
    const plain = mk()
    for (let i = 0; i < 60; i++) sim.stepSeal(plain as never, ctrl, DT, { w: 1e6, h: 540 })
    const plainSp = Math.hypot(plain.vx, plain.vy)
    expect(plainSp).toBeLessThanOrEqual(bal.BAL.sealSpeed + 1)

    // с баффом: потолок ×2 реально достигается
    const buffed = mk()
    buffed.buffT = bal.STAR.buffSec
    for (let i = 0; i < 60; i++) sim.stepSeal(buffed as never, ctrl, DT, { w: 1e6, h: 540 })
    const buffedSp = Math.hypot(buffed.vx, buffed.vy)
    expect(buffedSp).toBeGreaterThan(bal.BAL.sealSpeed * 1.6)
    expect(buffedSp).toBeLessThanOrEqual(bal.BAL.sealSpeed * bal.STAR.buffMult + 1)

    // затухание: через buffSec бафф кончился и скорость снова клампится к обычной
    const total = Math.round((bal.STAR.buffSec + 1) / DT)
    for (let i = 0; i < total; i++) sim.stepSeal(buffed as never, ctrl, DT, { w: 1e6, h: 540 })
    expect(buffed.buffT).toBe(0)
    expect(Math.hypot(buffed.vx, buffed.vy)).toBeLessThanOrEqual(bal.BAL.sealSpeed + 1)
  })
})
