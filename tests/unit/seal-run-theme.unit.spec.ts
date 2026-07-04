import { describe, it, beforeAll, expect } from 'vitest'

/**
 * SR-06: арт-контракт Seal Run (core/theme.js) — числовые инварианты честности рендера:
 *  - каждый kind, который рисует game.js, имеет запись в TEXTURES;
 *  - тело спрайта хищника НАКРЫВАЕТ круглый хитбокс (визуал ≥ хитбокса, спека §8) —
 *    SR-05-плейсхолдеры это нарушали (орка 60 lu при хитбоксе 92);
 *  - фоновые параллакс-слои остаются в узкой полосе светимости вокруг воды, тюлень —
 *    далеко за её пределами (спека §11-5: фон не конкурирует с геймплеем);
 *  - параллакс: back-to-front монотонный, тайлы несоизмеримы.
 * Само рисование (render/art.js) — DOM-зависимое, проверяется превью/е2е (SR-14).
 */

type Theme = {
  BRAND: Record<string, string>
  WATER: { surface: string; mid: string; deep: string; floor: string }
  WATERLINE_Y: number
  PARALLAX: Record<string, { factor: number; tileW: number }>
  DEPTH_FADE: { far: number; mid: number }
  SEAL: Record<string, string>
  ENTITY: Record<string, Record<string, string> | string[]>
  TEXTURES: Record<
    string,
    { key?: string; frames?: string[]; w: number; h: number; bodyH?: number; originY?: number }
  >
  hexToRgb: (hex: string) => { r: number; g: number; b: number }
  mix: (a: string, b: string, t: number) => string
  rgba: (hex: string, a: number) => string
  relLuma: (hex: string) => number
}
type Balance = {
  OBSTACLE_DIMS: Record<string, { w?: number; h?: number; r?: number }>
  SEAL_R: number
}

let T: Theme
let B: Balance

beforeAll(async () => {
  T = (await import(
    new URL('../../public/games/seal-run-v1/core/theme.js', import.meta.url).href
  )) as Theme
  B = (await import(
    new URL('../../public/games/seal-run-v1/core/balance.js', import.meta.url).href
  )) as Balance
})

const HEX = /^#[0-9a-fA-F]{6}$/
const RGBA = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/

describe('SR-06: покрытие текстурами', () => {
  it('каждый kind рендера имеет запись в TEXTURES с валидными габаритами', () => {
    const kinds = [
      'seal', 'orca', 'shark_white', 'shark_big', 'fish_small', 'fish_rare',
      'rock', 'skerry_cap', 'ghost_net', 'plastic_cluster',
    ]
    for (const k of kinds) {
      const t = T.TEXTURES[k]
      expect(t, k).toBeDefined()
      expect(t.w, k).toBeGreaterThan(0)
      expect(t.h, k).toBeGreaterThan(0)
      // ключ текстуры = kind (пулы game.js) либо явные кадры
      if (t.frames) expect(t.frames.length).toBeGreaterThanOrEqual(2)
      else expect(t.key).toBe(k)
    }
  })

  it('мусор рисуется в габарит хитбокса OBSTACLE_DIMS', () => {
    for (const k of ['ghost_net', 'plastic_cluster'] as const) {
      expect(T.TEXTURES[k].w).toBe(B.OBSTACLE_DIMS[k].w)
      expect(T.TEXTURES[k].h).toBe(B.OBSTACLE_DIMS[k].h)
    }
  })

  it('тело хищника накрывает круглый хитбокс; origin держит круг внутри канваса', () => {
    for (const k of ['orca', 'shark_white', 'shark_big'] as const) {
      const t = T.TEXTURES[k]
      const d = 2 * (B.OBSTACLE_DIMS[k].r as number)
      expect(t.w, `${k}: ширина ≥ Ø хитбокса`).toBeGreaterThanOrEqual(d)
      expect(t.bodyH, `${k}: высота тела ≥ Ø хитбокса`).toBeGreaterThanOrEqual(d)
      const oy = (t.originY ?? 0.5) * t.h
      expect(oy, `${k}: тело не вылезает вверх`).toBeGreaterThanOrEqual(d / 2)
      expect(t.h - oy, `${k}: тело не вылезает вниз`).toBeGreaterThanOrEqual(d / 2)
    }
    expect(T.TEXTURES.seal.bodyH).toBeGreaterThanOrEqual(2 * B.SEAL_R)
  })
})

describe('SR-06: палитра и хелперы', () => {
  it('все цвета темы — валидный hex или rgba()', () => {
    const walk = (obj: unknown, path: string) => {
      if (typeof obj === 'string') {
        expect(obj, path).toMatch(obj.startsWith('#') ? HEX : RGBA)
        return
      }
      if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, `${path}[${i}]`))
      else if (obj && typeof obj === 'object')
        for (const [k, v] of Object.entries(obj)) walk(v, `${path}.${k}`)
    }
    walk(T.BRAND, 'BRAND')
    walk(T.WATER, 'WATER')
    walk(T.SEAL, 'SEAL')
    walk(T.ENTITY, 'ENTITY')
  })

  it('mix/rgba/relLuma ведут себя как заявлено', () => {
    expect(T.mix('#000000', '#ffffff', 0)).toBe('#000000')
    expect(T.mix('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(T.rgba('#15303a', 0.5)).toBe('rgba(21,48,58,0.5)')
    expect(T.relLuma('#000000')).toBe(0)
    expect(T.relLuma('#ffffff')).toBeCloseTo(1, 5)
  })
})

describe('SR-06: контракт слоёв (фон не конкурирует с геймплеем)', () => {
  it('параллакс: 0 < far < mid < 1, тайлы разной ширины', () => {
    const { far, mid } = T.PARALLAX
    expect(far.factor).toBeGreaterThan(0)
    expect(mid.factor).toBeGreaterThan(far.factor)
    expect(mid.factor).toBeLessThan(1)
    expect(far.tileW).not.toBe(mid.tileW)
  })

  it('затухшие цвета фоновых слоёв — в узкой полосе светимости у воды', () => {
    const rock = T.ENTITY.rock as Record<string, string>
    const kelp = T.ENTITY.kelp as string[]
    const base = T.relLuma(T.WATER.deep)
    const check = (hex: string, fade: number, path: string) => {
      const faded = T.mix(hex, T.WATER.deep, fade)
      expect(Math.abs(T.relLuma(faded) - base), path).toBeLessThanOrEqual(0.08)
    }
    for (const c of [rock.base, ...kelp]) check(c, T.DEPTH_FADE.far, `far:${c}`)
    for (const c of [rock.base, rock.lit, '#1D3A43', ...kelp]) check(c, T.DEPTH_FADE.mid, `mid:${c}`)
  })

  it('тюлень читается на любой глубине: |ΔL| ≥ 0.2 от всей толщи воды', () => {
    const body = T.relLuma(T.SEAL.body)
    for (const w of [T.WATER.surface, T.WATER.mid, T.WATER.deep, T.WATER.floor]) {
      expect(Math.abs(body - T.relLuma(w))).toBeGreaterThanOrEqual(0.2)
    }
  })
})
