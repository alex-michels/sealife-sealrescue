import { beforeAll, describe, expect, it } from 'vitest'
import {
  generateCourse,
  generateRound,
  SURFACE_ACTOR_GAP,
  occupiesUpperWater,
} from '../../public/games/seal-run-v1/core/course.js'

type State = {
  y: number
  targetY: number
  d: number
  worldD: number
  tMs: number
  lives: number
  phase: string
}
type Sim = {
  createSim(course: unknown): State
  step(state: State): void
  takeEvents(state: State): { type: string; cause?: string }[]
  predatorPos(obstacle: unknown, distance: number): { x: number; y: number; r: number }
}
let sim: Sim
let lintCourse: (course: unknown, registry: unknown[]) => string[]
let registry: unknown[]
beforeAll(async () => {
  sim = (await import(
    new URL('../../public/games/seal-run-v1/core/sim.js', import.meta.url).href
  )) as Sim
  registry = (
    await import(
      new URL('../../public/games/seal-run-v1/core/chunks/biomes.js', import.meta.url).href
    )
  ).ALL_CHUNKS
  lintCourse = (
    await import(
      new URL('../../public/games/seal-run-v1/tools/chunk-lint-lib.mjs', import.meta.url).href
    )
  ).lintCourse
})
describe('SR-02/03/19: surface hazards', () => {
  it('all 260 weekly chapters keep bears apart and place motors in clear water', () => {
    let bears = 0
    for (let week = 1; week <= 52; week++)
      for (let chapter = 0; chapter < 5; chapter++) {
        const course = generateRound('2026-W' + String(week).padStart(2, '0'), chapter)
        expect(lintCourse(course, registry), course.seedStr).toEqual([])
        const polar = course.obstacles.filter((o) => o.type === 'polar_bear')
        bears += polar.length
        for (let i = 1; i < polar.length; i++)
          expect(polar[i].atLu - polar[i - 1].atLu).toBeGreaterThanOrEqual(SURFACE_ACTOR_GAP)
        const boats = course.obstacles.filter((o) => o.type === 'boat_propeller')
        expect(boats.length, course.seedStr).toBeGreaterThan(0)
        for (const boat of boats) {
          expect(boat.band).toBe(1)
          expect(boat.atLu).toBeGreaterThan(3600)
          for (const other of course.obstacles)
            if (other !== boat && occupiesUpperWater(other))
              expect(Math.abs(other.atLu - boat.atLu)).toBeGreaterThanOrEqual(SURFACE_ACTOR_GAP)
          expect(course.fish.some((f) => f.band === 1 && Math.abs(f.atLu - boat.atLu) < 150)).toBe(
            false,
          )
        }
      }
    expect(bears).toBeGreaterThan(100)
  }, 30000)
  it('propellers use the same fixed-position collision in browser, simulation and bots', () => {
    const obstacle = { type: 'boat_propeller', band: 1, atLu: 1000 }
    expect(sim.predatorPos(obstacle, 0)).toEqual({ x: 1000, y: 162, r: 32 })
    expect(sim.predatorPos(obstacle, 900)).toEqual(sim.predatorPos(obstacle, 0))
    const course = { ...generateCourse('propeller-contact'), obstacles: [obstacle], fish: [] }
    const hit = sim.createSim(course)
    hit.d = hit.worldD = 998
    hit.y = 162
    hit.targetY = 162
    sim.step(hit)
    expect(hit.lives).toBe(2)
    expect(sim.takeEvents(hit)).toContainEqual(
      expect.objectContaining({ type: 'life-lost', cause: 'boat_propeller' }),
    )
    for (let i = 0; i < 60; i++) sim.step(hit)
    expect(hit.lives).toBe(2)
    // Decorative hull directly above the propeller and forward along its length.
    for (const x of [1000, 1160, 1300]) {
      const hull = sim.createSim(course)
      hull.d = hull.worldD = x
      hull.y = hull.targetY = 70
      sim.step(hull)
      expect(hull.lives).toBe(3)
    }
    const diving = sim.createSim(course)
    diving.d = diving.worldD = 998
    diving.y = 230
    diving.targetY = 230
    sim.step(diving)
    expect(diving.lives).toBe(3)
  })
})
