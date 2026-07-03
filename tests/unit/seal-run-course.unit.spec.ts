import { describe, it, beforeAll, expect } from 'vitest'

/**
 * SR-02: изоморфный генератор трассы Seal Run — детерминизм + инварианты чанк-линта
 * (спека docs/game-seal-run-spec.md §9). Сам факт import из Node — часть контракта:
 * тот же файл, что грузит браузер, обязан работать в серверном адаптере анти-чита
 * (SR-10 п.3). Полный кросс-рантайм golden-hash (Node ↔ браузерный билд) — SR-14.
 *
 * Ручной прогон линта пошире:
 *   node public/games/seal-run-v1/tools/chunk-lint.mjs 200
 */

type Fish = { type: string; band: number; atLu: number; points: number }
type Course = {
  seedStr: string
  seedU32: number
  biome: string
  lengthLu: number
  chunkIds: string[]
  chunkStarts: number[]
  obstacles: Array<{ type: string; band: number; atLu: number }>
  fish: Fish[]
}
type CourseLib = {
  COURSE_LENGTH_LU: number
  CHUNK_LEN_LU: number
  FISH_POINTS_BUDGET_MAX: number
  difficultyCeil: (d: number) => number
  generateCourse: (seedStr: string, biome?: string) => Course
  courseHash: (c: Course) => number
  fishCountBudget: (c: Course, d: number) => number
  fishPointsBudget: (c: Course, d: number) => number
}
type ChunksLib = { CHUNKS: Array<{ id: string; difficulty: number; biome: string }> }
type LintLib = {
  runLint: (registry: unknown[], seeds: string[]) => string[]
  lintLibrary: (registry: unknown[]) => string[]
}

let course: CourseLib
let chunks: ChunksLib
let lint: LintLib

// Сиды-сезоны для CI-прогона (полный — CLI-инструментом, см. шапку).
const SEEDS = Array.from({ length: 20 }, (_, i) => `2026-W${String(i + 1).padStart(2, '0')}`)

beforeAll(async () => {
  course = (await import(
    new URL('../../public/games/seal-run-v1/core/course.js', import.meta.url).href
  )) as CourseLib
  chunks = (await import(
    new URL('../../public/games/seal-run-v1/core/chunks/index.js', import.meta.url).href
  )) as ChunksLib
  lint = (await import(
    new URL('../../public/games/seal-run-v1/tools/chunk-lint-lib.mjs', import.meta.url).href
  )) as LintLib
})

describe('SR-02: библиотека чанков', () => {
  it('реестр: 15–25 чанков, отсортирован по id, один biome coastal', () => {
    expect(chunks.CHUNKS.length).toBeGreaterThanOrEqual(15)
    expect(chunks.CHUNKS.length).toBeLessThanOrEqual(25)
    const ids = chunks.CHUNKS.map((c) => c.id)
    expect(ids).toEqual([...ids].sort())
    expect(new Set(ids).size).toBe(ids.length)
    expect(chunks.CHUNKS.every((c) => c.biome === 'coastal')).toBe(true)
  })

  it('статические инварианты библиотеки (§9.4) — чисто', () => {
    expect(lint.lintLibrary(chunks.CHUNKS)).toEqual([])
  })
})

describe('SR-02: generateCourse — детерминизм и сборка', () => {
  it('один сид → байт-в-байт одинаковая трасса (courseHash повторяем)', () => {
    const a = course.generateCourse('2026-W27')
    const b = course.generateCourse('2026-W27')
    expect(course.courseHash(a)).toBe(course.courseHash(b))
    expect(a.chunkIds).toEqual(b.chunkIds)
    expect(a.fish).toEqual(b.fish)
  })

  it('разные сиды → разные трассы', () => {
    const a = course.generateCourse('2026-W27')
    const b = course.generateCourse('2026-W28')
    expect(a.chunkIds).not.toEqual(b.chunkIds)
  })

  it('сборка: ровно COURSE_LENGTH_LU, старт только из difficulty-1', () => {
    for (const seed of SEEDS) {
      const c = course.generateCourse(seed)
      expect(c.chunkIds.length * course.CHUNK_LEN_LU).toBe(course.COURSE_LENGTH_LU)
      const byId = new Map(chunks.CHUNKS.map((ch) => [ch.id, ch]))
      // до 3000 lu difficultyCeil = 1 → первые 3 чанка (0/1200/2400) всегда лёгкие
      for (let i = 0; i < 3; i++) expect(byId.get(c.chunkIds[i])?.difficulty).toBe(1)
    }
  })

  it('difficultyCeil: 1 на старте, 5 с конца рампы', () => {
    expect(course.difficultyCeil(0)).toBe(1)
    expect(course.difficultyCeil(2999)).toBe(1)
    expect(course.difficultyCeil(3000)).toBe(2)
    expect(course.difficultyCeil(11999)).toBe(4)
    expect(course.difficultyCeil(12000)).toBe(5)
    expect(course.difficultyCeil(36000)).toBe(5)
  })
})

describe('SR-02: бюджеты рыбы (опора анти-чита SR-10)', () => {
  it('монотонны, полный бюджет ≤ FISH_POINTS_BUDGET_MAX, формула очков ≤ Zod-капу', () => {
    for (const seed of SEEDS) {
      const c = course.generateCourse(seed)
      const p1 = course.fishPointsBudget(c, 12000)
      const p2 = course.fishPointsBudget(c, 24000)
      const pAll = course.fishPointsBudget(c, c.lengthLu)
      expect(p1).toBeLessThanOrEqual(p2)
      expect(p2).toBeLessThanOrEqual(pAll)
      expect(pAll).toBeLessThanOrEqual(course.FISH_POINTS_BUDGET_MAX)
      expect(course.fishCountBudget(c, 0)).toBe(0)
      expect(course.fishCountBudget(c, c.lengthLu)).toBe(c.fish.length)
      // спека §10.2: максимум производной формулы очков не пробивает Zod-кап 100 000
      expect(100 * 900 + 20 * pAll + 300 * 3).toBeLessThanOrEqual(100_000)
    }
  })
})

describe('SR-02: chunk-lint по сборкам (гейт CI, §9.4)', () => {
  it('20 сидов-сезонов: проходимость, коридоры, питание, бюджет — чисто', () => {
    const errors = lint.runLint(chunks.CHUNKS, SEEDS)
    expect(errors, errors.join('\n')).toEqual([])
  })
})
