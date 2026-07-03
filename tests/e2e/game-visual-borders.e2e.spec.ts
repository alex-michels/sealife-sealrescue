import { test, expect, type Page } from '@playwright/test'

/**
 * Seal The Hunter border/surface visual regressions.
 *
 * These tests use the real browser canvas modules, but draw deterministic scratch canvases instead
 * of playing a round. The contract is intentionally render-only: prey/seal spawn, physics, cull and
 * collision stay covered by the sim/fairness tests; here we lock the layer order and edge painting.
 */

const GAME = 'http://localhost:3000/games/seal-hunt-v1/index.html?game=seal-the-hunter&lang=en'

type World = { w: number; h: number }
type View = { scale: number; ox: number; oy: number; dispW: number; dispH: number }
type FishScheme = { body: string; back: string; belly: string; eye: string }
type PreyShape = {
  x: number
  y: number
  px: number
  py: number
  vx: number
  vy: number
  r: number
  t: number
  dir: number
  ang: number
  face: number
  sp: { variant: string; scheme: FishScheme; prize?: boolean }
  phase: number
  fleeT: number
  restT: number
  tailKick: number
}
type PreyModule = {
  PREY: PreyShape[]
  drawPrey: (
    ctx: CanvasRenderingContext2D,
    world: World,
    surf?: { topExt?: number; ripples: boolean } | null,
  ) => void
}
type SceneryModule = {
  initBorder: (view: View, world: World, ctx: CanvasRenderingContext2D) => void
  drawBorderBack: (
    ctx: CanvasRenderingContext2D,
    view: View,
    world: World,
    t: number,
    reducedMotion?: boolean,
    bd?: boolean,
  ) => void
  drawBorderFront: (
    ctx: CanvasRenderingContext2D,
    view: View,
    world: World,
    t: number,
    reducedMotion?: boolean,
  ) => void
}
type SealModule = {
  makeSeal: (makeSpots: () => []) => {
    x: number
    y: number
    r: number
    px: number
    py: number
    vx: number
    vy: number
    angle: number
    draw: (ctx: CanvasRenderingContext2D) => void
  }
}
type ThemeModule = { PALETTE: { fish: { coral: FishScheme; silver: FishScheme } } }

async function openGame(page: Page) {
  // tsx/esbuild `keepNames` (путь загрузки спеков в CI) оборачивает именованные функции в
  // __name(fn, "name"); Playwright сериализует evaluate-колбэки через toString() БЕЗ
  // bundle-scope, где __name определён → ReferenceError в браузере. Глобальный стаб делает
  // колбэки нечувствительными к транспайлеру; передан СТРОКОЙ, чтобы сам init-скрипт не
  // транспилировался. (Локально спеки идут через транспайлер Playwright без keepNames —
  // поэтому баг воспроизводился только в CI.)
  await page.addInitScript({ content: 'globalThis.__name = globalThis.__name || ((f) => f);' })
  await page.goto(GAME)
  await page.waitForFunction(() => Boolean((window as unknown as { SealI18n?: unknown }).SealI18n))
}

test.describe('Seal The Hunter visual borders', () => {
  test('draws left/right kelp walls above seal and prey at the border', async ({ page }) => {
    await openGame(page)

    const metrics = await page.evaluate(async () => {
      const scenerySpec = '/games/seal-hunt-v1/render/scenery.js'
      const preySpec = '/games/seal-hunt-v1/entities/prey.js'
      const sealSpec = '/games/seal-hunt-v1/entities/seal.js'
      const themeSpec = '/games/seal-hunt-v1/core/theme.js'
      const scenery = (await import(/* @vite-ignore */ scenerySpec)) as unknown as SceneryModule
      const prey = (await import(/* @vite-ignore */ preySpec)) as unknown as PreyModule
      const sealMod = (await import(/* @vite-ignore */ sealSpec)) as unknown as SealModule
      const theme = (await import(/* @vite-ignore */ themeSpec)) as unknown as ThemeModule

      // Helpers defined as object methods to avoid esbuild keepNames injecting
      // __name() wrappers that are undefined in the browser's page.evaluate scope.
      const h = {
        makeCanvas(w: number, h: number) {
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })
          if (!ctx) throw new Error('2D canvas context is unavailable')
          return { canvas, ctx }
        },
        withSeed<T>(seed: number, fn: () => T): T {
          const original = Math.random
          let s = seed >>> 0
          Math.random = () => {
            s = (s * 1664525 + 1013904223) >>> 0
            return s / 2 ** 32
          }
          try {
            return fn()
          } finally {
            Math.random = original
          }
        },
        makePrey(x: number, y: number, face: number): PreyShape {
          return {
            x,
            y,
            px: x,
            py: y,
            vx: face > 0 ? 120 : -120,
            vy: 0,
            r: 24,
            t: 0,
            dir: face,
            ang: face > 0 ? 0 : Math.PI,
            face,
            sp: { variant: 'round', scheme: theme.PALETTE.fish.coral, prize: true },
            phase: 0,
            fleeT: 0,
            restT: 0,
            tailKick: 0,
          }
        },
        countChanged(
          before: Uint8ClampedArray,
          after: Uint8ClampedArray,
          width: number,
          rect: { x: number; y: number; w: number; h: number },
        ) {
          let changed = 0
          for (let y = rect.y; y < rect.y + rect.h; y++) {
            for (let x = rect.x; x < rect.x + rect.w; x++) {
              const i = (y * width + x) * 4
              const delta =
                Math.abs(after[i] - before[i]) +
                Math.abs(after[i + 1] - before[i + 1]) +
                Math.abs(after[i + 2] - before[i + 2])
              if (delta > 32) changed++
            }
          }
          return changed
        },
      }

      const world = { w: 960, h: 540 }
      const view = { scale: 1, ox: 160, oy: 0, dispW: 1280, dispH: 540 }
      const { canvas, ctx } = h.makeCanvas(view.dispW, view.dispH)

      h.withSeed(7, () => scenery.initBorder(view, world, ctx))
      ctx.fillStyle = '#0B2832'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      scenery.drawBorderBack(ctx, view, world, 1.25, true, false)

      ctx.save()
      ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy)
      const seal = sealMod.makeSeal(() => [])
      seal.x = -12
      seal.y = world.h * 0.5
      seal.px = seal.x
      seal.py = seal.y
      seal.vx = 0
      seal.vy = 0
      seal.r = 34
      seal.angle = 0
      seal.draw(ctx)
      prey.PREY.length = 0
      prey.PREY.push(h.makePrey(world.w + 12, world.h * 0.5, -1))
      prey.drawPrey(ctx, world, null)
      ctx.restore()

      const beforeFront = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      scenery.drawBorderFront(ctx, view, world, 1.25, true)
      const afterFront = ctx.getImageData(0, 0, canvas.width, canvas.height).data

      return {
        leftChanged: h.countChanged(beforeFront, afterFront, canvas.width, {
          x: view.ox - 62,
          y: 214,
          w: 57,
          h: 112,
        }),
        rightChanged: h.countChanged(beforeFront, afterFront, canvas.width, {
          x: view.ox + world.w + 5,
          y: 226,
          w: 76,
          h: 88,
        }),
      }
    })

    expect(metrics.leftChanged, 'left kelp wall should repaint pixels over the seal').toBeGreaterThan(
      160,
    )
    expect(
      metrics.rightChanged,
      'right kelp wall should repaint pixels over the prey',
    ).toBeGreaterThan(120)
  })

  test('keeps prey visible beyond left/right borders instead of hard-clipping them', async ({
    page,
  }) => {
    await openGame(page)

    const metrics = await page.evaluate(async () => {
      const preySpec = '/games/seal-hunt-v1/entities/prey.js'
      const themeSpec = '/games/seal-hunt-v1/core/theme.js'
      const prey = (await import(/* @vite-ignore */ preySpec)) as unknown as PreyModule
      const theme = (await import(/* @vite-ignore */ themeSpec)) as unknown as ThemeModule

      const canvas = document.createElement('canvas')
      canvas.width = 280
      canvas.height = 180
      const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })
      if (!ctx) throw new Error('2D canvas context is unavailable')

      const world = { w: 180, h: 110 }
      const ox = 50
      const oy = 35

      // Object method shorthands avoid esbuild keepNames __name() injection.
      const h = {
        makeFish(x: number, face: number): PreyShape {
          return {
            x,
            y: world.h * 0.5,
            px: x,
            py: world.h * 0.5,
            vx: face > 0 ? 100 : -100,
            vy: 0,
            r: 20,
            t: 0,
            dir: face,
            ang: face > 0 ? 0 : Math.PI,
            face,
            sp: { variant: 'round', scheme: theme.PALETTE.fish.coral, prize: true },
            phase: 0,
            fleeT: 0,
            restT: 0,
            tailKick: 0,
          }
        },
        alphaPixels(rect: { x: number; y: number; w: number; h: number }) {
          let pixels = 0
          for (let y = rect.y; y < rect.y + rect.h; y++) {
            for (let x = rect.x; x < rect.x + rect.w; x++) {
              if (data[(y * canvas.width + x) * 4 + 3] > 16) pixels++
            }
          }
          return pixels
        },
      }

      prey.PREY.length = 0
      prey.PREY.push(h.makeFish(-18, 1), h.makeFish(world.w + 18, -1))

      ctx.save()
      ctx.translate(ox, oy)
      prey.drawPrey(ctx, world, null)
      ctx.restore()

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data

      return {
        leftOutside: h.alphaPixels({ x: 0, y: oy, w: ox, h: world.h }),
        rightOutside: h.alphaPixels({ x: ox + world.w, y: oy, w: 50, h: world.h }),
      }
    })

    expect(metrics.leftOutside, 'left-border prey should still paint into the border').toBeGreaterThan(
      120,
    )
    expect(
      metrics.rightOutside,
      'right-border prey should still paint into the border',
    ).toBeGreaterThan(120)
  })

  test('clips top-surface prey at the waterline without faking a catchable target', async ({
    page,
  }) => {
    await openGame(page)
    // On ultra-tall screens the top border is air. Prey crossing the waterline must NOT paint in
    // the air, and — critically — a fish that has fully breached the surface (above worldY 0,
    // where the field-clamped seal can never reach it) must NOT be drawn as a solid target below
    // the water. Otherwise the render lies about the sim position and clicks on that phantom fail
    // to register a catch. The honest treatment: clip at the waterline + draw at the real
    // position, so what shows below the water is always reachable. Collision stays sim-tested.
    const metrics = await page.evaluate(async () => {
      const preySpec = '/games/seal-hunt-v1/entities/prey.js'
      const themeSpec = '/games/seal-hunt-v1/core/theme.js'
      const prey = (await import(/* @vite-ignore */ preySpec)) as unknown as PreyModule
      const theme = (await import(/* @vite-ignore */ themeSpec)) as unknown as ThemeModule

      const world = { w: 180, h: 120 }
      const ox = 30
      const waterY = 90 // worldY 0 → canvas y 90 (air above, water below)

      // Object method shorthand avoids esbuild keepNames __name() injection.
      const h = {
        makeSurfaceFish(y: number): PreyShape {
          return {
            x: world.w * 0.5,
            y,
            px: world.w * 0.5,
            py: y,
            vx: 0,
            vy: -120,
            r: 20,
            t: 0,
            dir: 1,
            ang: -Math.PI / 2,
            face: 1,
            sp: { variant: 'round', scheme: theme.PALETTE.fish.coral, prize: true },
            phase: 0,
            fleeT: 0,
            restT: 0,
            tailKick: 0,
          }
        },
        // NB: никаких именованных const-arrow ВНУТРИ методов — esbuild keepNames обернул бы их
        // в __name(...) (см. openGame). Хелпер подсчёта — соседний метод-шортхенд.
        countPixels(
          data: Uint8ClampedArray,
          width: number,
          rect: { x: number; y: number; w: number; h: number },
        ) {
          let pixels = 0
          for (let y = rect.y; y < rect.y + rect.h; y++) {
            for (let x = rect.x; x < rect.x + rect.w; x++) {
              if (data[(y * width + x) * 4 + 3] > 16) pixels++
            }
          }
          return pixels
        },
        render(fishY: number) {
          const canvas = document.createElement('canvas')
          canvas.width = 240
          canvas.height = 210
          const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })
          if (!ctx) throw new Error('2D canvas context is unavailable')
          prey.PREY.length = 0
          prey.PREY.push(this.makeSurfaceFish(fishY))
          ctx.save()
          ctx.translate(ox, waterY)
          prey.drawPrey(ctx, world, { ripples: true })
          ctx.restore()
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
          return {
            airPixels: this.countPixels(data, canvas.width, { x: ox + 35, y: 0, w: 110, h: waterY - 6 }),
            waterPixels: this.countPixels(data, canvas.width, { x: ox + 35, y: waterY + 4, w: 110, h: 76 }),
          }
        },
      }

      return {
        // Straddling the surface: sprite radius pokes above the waterline, body dips below it.
        straddle: h.render(6),
        // Fully breached above the surface — unreachable by the seal.
        breached: h.render(-30),
      }
    })

    // A fish at the surface shows its below-water body and paints nothing in the air.
    expect(
      metrics.straddle.airPixels,
      'surface prey should not render in the air above the waterline',
    ).toBe(0)
    expect(
      metrics.straddle.waterPixels,
      'surface prey should stay visible below the waterline',
    ).toBeGreaterThan(220)

    // A fully-breached fish is clipped away — no air pixels AND no solid catchable phantom below.
    expect(
      metrics.breached.airPixels,
      'breached prey should not render in the air',
    ).toBe(0)
    expect(
      metrics.breached.waterPixels,
      'breached prey must not be drawn as a solid target below the water',
    ).toBeLessThan(60)
  })
})
