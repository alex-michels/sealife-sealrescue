import { describe, it, beforeAll, expect } from 'vitest'

/**
 * SR-03: DOM-free sim-core Seal Run (core/sim.js + core/balance.js) — контракты спеки
 * docs/game-seal-run-spec.md: физика Y (§2.2 + производный тайминг перехода полосы),
 * автомат стамина/жизни (§5.2), три яруса препятствий (§6), рыба/баффы (§7),
 * завершение и формула очков (§10), детерминизм (§1.3).
 *
 * Синтетические мини-трассы собираются литералами (createSim принимает course-объект);
 * детерминизм гоняется на реальной generateCourse-трассе.
 */

type Course = {
  lengthLu: number
  obstacles: Array<Record<string, unknown>>
  fish: Array<{ type: string; band: number; atLu: number; points: number }>
}
type SimState = {
  y: number
  vy: number
  targetY: number
  d: number
  tMs: number
  effSpeed: number
  lives: number
  stamina: number
  status: string
  phase: string
  finishedByTimeout: boolean
  buffLeftMs: number
  debrisUntilMs: number
  events: Array<{ t: number; type: string }>
}
type SimLib = {
  createSim: (c: unknown) => SimState
  applyInput: (s: SimState, ctrl: { targetY?: number; pointerY?: number; keyDir?: number }, dt?: number) => void
  step: (s: SimState, dt?: number) => void
  takeEvents: (s: SimState) => Array<{ t: number; type: string }>
  getResult: (s: SimState) => {
    phase: string
    distanceM: number
    fishCollected: number
    fishPoints: number
    livesRemaining: number
    durationMs: number
    score: number
  }
  predatorPos: (o: unknown, d: number) => { x: number; y: number; r: number }
}
type BalanceLib = {
  SIM_DT: number
  // тюнинги — мутируемый BAL (SR-04: compare-variants подменяет значения для A/B)
  BAL: {
    STAMINA_MAX: number
    STAMINA_DRAIN_PER_SEC: number
    GRACE_WINDOW_MS: number
    STAMINA_REFILL_AFTER_LIFE: number
    BUFF_STACK_MAX_MS: number
    FISH_SPEED_BUFF_MULT: number
    DEBRIS_SLOW_MULT: number
    MAX_COURSE_MS: number
    SCORE_PER_M: number
    SCORE_PER_LIFE: number
  }
  baseSpeed: (d: number) => number
  bandY: (k: number) => number
  computeScore: (m: number, fp: number, l: number) => number
}
type CourseLib = { generateCourse: (seed: string) => unknown; hashStr: (s: string) => number }

let sim: SimLib
let bal: BalanceLib
let courseLib: CourseLib

const empty = (lengthLu = 36000): Course => ({ lengthLu, obstacles: [], fish: [] })

/** Прогнать N тиков с фиксированным targetY; вернуть число тиков до предиката (или -1). */
function runUntil(s: SimState, maxTicks: number, pred: (s: SimState) => boolean): number {
  for (let i = 0; i < maxTicks; i++) {
    sim.step(s)
    if (pred(s)) return i + 1
  }
  return -1
}

beforeAll(async () => {
  sim = (await import(
    new URL('../../public/games/seal-run-v1/core/sim.js', import.meta.url).href
  )) as SimLib
  bal = (await import(
    new URL('../../public/games/seal-run-v1/core/balance.js', import.meta.url).href
  )) as BalanceLib
  courseLib = (await import(
    new URL('../../public/games/seal-run-v1/core/course.js', import.meta.url).href
  )) as CourseLib
})

describe('SR-03: физика Y (eased target-Y follow, §2.2)', () => {
  it('переход на соседнюю полосу занимает ~0.3–0.6 с, без осцилляций', () => {
    const s = sim.createSim(empty())
    sim.applyInput(s, { targetY: bal.bandY(1) }) // 270 → 162
    const ticks = runUntil(s, 120, (st) => st.y <= bal.bandY(1) + 10)
    expect(ticks).toBeGreaterThan(0)
    const sec = ticks * bal.SIM_DT
    expect(sec).toBeGreaterThan(0.25)
    expect(sec).toBeLessThan(0.6)
    // стабилизация: ещё полсекунды — тюлень у цели и не проскочил её
    for (let i = 0; i < 60; i++) sim.step(s)
    expect(Math.abs(s.y - bal.bandY(1))).toBeLessThan(4)
  })

  it('клавиши двигают targetY со скоростью KEY_TARGET_SPEED, кламп границами воды', () => {
    const s = sim.createSim(empty())
    for (let i = 0; i < 600; i++) {
      sim.applyInput(s, { keyDir: 1 })
      sim.step(s)
    }
    expect(s.targetY).toBe(540 - 24) // Y_MAX
    expect(s.y).toBeLessThanOrEqual(540 - 24)
  })
})

describe('SR-03: стамина/кислород + жизни (§5.2)', () => {
  it('без рыбы: каскад exhausted → grace → −жизнь ×3 → смерть на ~56-й секунде', () => {
    const s = sim.createSim(empty())
    const ticks = runUntil(s, 120 * 70, (st) => st.phase === 'dead')
    expect(ticks).toBeGreaterThan(0)
    // 25с (100/4) + 2с grace + 2×(12.5с + 2с) = 56с
    expect(s.tMs).toBeGreaterThan(55_000)
    expect(s.tMs).toBeLessThan(57_000)
    expect(s.lives).toBe(0)
    const ev = sim.takeEvents(s)
    expect(ev.filter((e) => e.type === 'exhausted').length).toBe(3)
    expect(ev.filter((e) => e.type === 'life-lost').length).toBe(3)
    expect(ev.filter((e) => e.type === 'dead').length).toBe(1)
    // очки мёртвого забега: только дистанция (0 рыбы, 0 жизней)
    const r = sim.getResult(s)
    expect(r.score).toBe(bal.BAL.SCORE_PER_M * r.distanceM)
    expect(r.livesRemaining).toBe(0)
  })

  it('в состоянии EXHAUSTED мир замедлен ×0.6', () => {
    const s = sim.createSim(empty())
    runUntil(s, 120 * 30, (st) => st.status === 'exhausted')
    sim.step(s)
    // effSpeed берёт baseSpeed ДО сдвига d за тик — сравниваем множитель с допуском рампы
    expect(s.effSpeed / bal.baseSpeed(s.d)).toBeCloseTo(0.6, 3)
  })
})

describe('SR-03: рыба — очки, стамина, бафф длительностью (§7)', () => {
  it('подбор: +очки, +стамина (кап 100), бафф ×1.15; стак капится BUFF_STACK_MAX_MS', () => {
    const fish = Array.from({ length: 6 }, (_, i) => ({
      type: 'fish_small',
      band: 2,
      atLu: 300 + i * 90,
      points: 1,
    }))
    fish.push({ type: 'fish_rare', band: 2, atLu: 1000, points: 4 })
    const s = sim.createSim({ ...empty(), fish })
    runUntil(s, 120 * 8, (st) => st.d > 1200)
    // restore перекрывает пассивный расход (после последней рыбы ~0.8 c дрейфа)
    expect(s.stamina).toBeGreaterThan(90)
    expect(s.stamina).toBeLessThanOrEqual(bal.BAL.STAMINA_MAX)
    expect(s.buffLeftMs).toBeGreaterThan(0)
    expect(s.buffLeftMs).toBeLessThanOrEqual(bal.BAL.BUFF_STACK_MAX_MS)
    expect(s.effSpeed / bal.baseSpeed(s.d)).toBeCloseTo(bal.BAL.FISH_SPEED_BUFF_MULT, 3)
    const r = sim.getResult(s)
    expect(r.fishCollected).toBe(7)
    expect(r.fishPoints).toBe(6 + 4)
  })
})

describe('SR-03: ярусы препятствий (§6)', () => {
  it('хищник: −1 жизнь, мир стоит в хит-стане, отброс по Y, i-frames без двойного списания', () => {
    const s = sim.createSim({ ...empty(), obstacles: [{ type: 'shark_white', band: 2, atLu: 800 }] })
    const hitTick = runUntil(s, 120 * 10, (st) => st.lives < 3)
    expect(hitTick).toBeGreaterThan(0)
    const dAtHit = s.d
    const yAtHit = s.y
    for (let i = 0; i < Math.round(0.38 / bal.SIM_DT); i++) sim.step(s) // внутри стана (400 мс)
    expect(s.d).toBe(dAtHit) // мир заморожен
    expect(Math.abs(s.y - yAtHit)).toBeGreaterThan(30) // отброс ~40 lu
    // акула проходит сквозь бывшую позицию под i-frames — второго списания нет
    runUntil(s, 120 * 5, (st) => st.d > dAtHit + 900)
    expect(s.lives).toBe(2)
    expect(sim.takeEvents(s).filter((e) => e.type === 'predator-hit').length).toBe(1)
  })

  it('камень: отскок без потери жизни + разовый стамина-налог с кулдауном', () => {
    const rock = { x: 500, halfW: 80, yTop: bal.bandY(4) - 70, yBot: bal.bandY(4) + 70 }
    const s = sim.createSim({
      ...empty(),
      obstacles: [{ type: 'rock', band: 4, atLu: 500, w: 160, h: 140 }],
    })
    sim.applyInput(s, { targetY: bal.bandY(4) }) // упорно плывём в камень
    // инвариант: в конце КАЖДОГО тика тюлень вытолкнут из твёрдой геометрии
    for (let i = 0; i < 120 * 6 && s.d <= 800; i++) {
      sim.step(s)
      const cx = Math.max(rock.x - rock.halfW, Math.min(rock.x + rock.halfW, s.d))
      const cy = Math.max(rock.yTop, Math.min(rock.yBot, s.y))
      expect(Math.hypot(s.d - cx, s.y - cy), `тик ${i}: тюлень внутри камня`).toBeGreaterThanOrEqual(24 - 0.5)
    }
    expect(s.lives).toBe(3)
    const bounces = sim.takeEvents(s).filter((e) => e.type === 'rock-bounce')
    expect(bounces.length).toBeGreaterThanOrEqual(1)
    // налог списан за каждый bounce-event (кулдаун ROCK_TAX_COOLDOWN_MS учтён эмиссией)
    const expectedDrainMax = (s.tMs / 1000) * bal.BAL.STAMINA_DRAIN_PER_SEC + bounces.length * 5 + 1
    expect(s.stamina).toBeGreaterThanOrEqual(bal.BAL.STAMINA_MAX - expectedDrainMax)
  })

  it('мусор: slow ×0.4 + удвоенный расход, без потери жизни', () => {
    const s = sim.createSim({ ...empty(), obstacles: [{ type: 'ghost_net', band: 2, atLu: 400 }] })
    const enterTick = runUntil(s, 120 * 5, (st) => st.debrisUntilMs > st.tMs)
    expect(enterTick).toBeGreaterThan(0)
    sim.step(s)
    expect(s.effSpeed / bal.baseSpeed(s.d)).toBeCloseTo(bal.BAL.DEBRIS_SLOW_MULT, 3)
    expect(s.lives).toBe(3)
    const stBefore = s.stamina
    const t0 = s.tMs
    for (let i = 0; i < 60; i++) sim.step(s) // 0.5 c внутри зоны
    const drained = stBefore - s.stamina
    const expected = ((s.tMs - t0) / 1000) * bal.BAL.STAMINA_DRAIN_PER_SEC * 2
    expect(drained).toBeCloseTo(expected, 1)
  })
})

describe('SR-03: завершение и очки (§10)', () => {
  it('финиш-дистанция: phase=finished, score = 100·м + 20·fishPoints + 300·жизни', () => {
    const s = sim.createSim(empty(3000))
    const ticks = runUntil(s, 120 * 20, (st) => st.phase === 'finished')
    expect(ticks).toBeGreaterThan(0)
    const r = sim.getResult(s)
    expect(r.distanceM).toBe(75) // 3000 / 40
    expect(r.livesRemaining).toBe(3)
    expect(r.score).toBe(bal.computeScore(75, 0, 3))
    expect(r.score).toBe(75 * bal.BAL.SCORE_PER_M + 3 * bal.BAL.SCORE_PER_LIFE)
  })

  it('таймаут MAX_COURSE_MS: раунд фиксируется, finishedByTimeout', () => {
    const s = sim.createSim(empty())
    s.tMs = bal.BAL.MAX_COURSE_MS - 1
    sim.step(s)
    expect(s.phase).toBe('finished')
    expect(s.finishedByTimeout).toBe(true)
  })
})

describe('SR-03: детерминизм на реальной трассе (§1.3)', () => {
  it('одна трасса + один скрипт ввода → идентичный трейс и результат', () => {
    const course = courseLib.generateCourse('2026-W27')
    const run = () => {
      const s = sim.createSim(course)
      const q = (v: number) => Math.round(v * 1000) / 1000
      const trace: string[] = []
      for (let i = 0; i < 120 * 60 && s.phase === 'running'; i++) {
        // скриптованный «зигзаг» — детерминированная функция номера тика
        sim.applyInput(s, { targetY: 270 + 180 * Math.sin(i / 240) })
        sim.step(s)
        if (i % 60 === 0) trace.push(`${q(s.y)}:${q(s.d)}:${q(s.stamina)}:${s.lives}`)
      }
      const r = sim.getResult(s)
      return `${courseLib.hashStr(trace.join('|'))}:${r.score}:${r.distanceM}:${r.durationMs}`
    }
    expect(run()).toBe(run())
  })
})
