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
  initScenery: (world: World, ctx: CanvasRenderingContext2D) => void
  drawBackground: (
    ctx: CanvasRenderingContext2D,
    world: World,
    t: number,
    reducedMotion?: boolean,
    bottomExtra?: number,
  ) => void
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

  test('dresses every non-16:9 gap with the right scenery per orientation', async ({ page }) => {
    await openGame(page)
    // SH-12 матрица бордюров: contain-fit фикс-поля даёт зазор максимум по ОДНОЙ оси.
    // Шире 16:9 (21:9) и портрет-планшеты (3:4) → стены водорослей по бокам; уже 16:9
    // (16:10) и вытянутые телефоны (9:19.5) → небо сверху И дно снизу. Контракт ловит и
    // геометрию (какая ось получила зазор), и ТИП декорации в зазоре.
    const results = await page.evaluate(async () => {
      const scenerySpec = '/games/seal-hunt-v1/render/scenery.js'
      const scenery = (await import(/* @vite-ignore */ scenerySpec)) as unknown as SceneryModule

      const h = {
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
        // NB: хелперы — только метод-шортхенды (никаких именованных const-arrow даже внутри
        // методов): esbuild keepNames обернул бы их в __name(...) — см. стаб в openGame.
        luminance(
          data: Uint8ClampedArray,
          dispW: number,
          x0: number,
          y0: number,
          x1: number,
          y1: number,
        ) {
          let sum = 0
          let n = 0
          for (let y = y0; y < y1; y += 2) {
            for (let x = x0; x < x1; x += 2) {
              const i = (y * dispW + x) * 4
              sum += (data[i] + data[i + 1] + data[i + 2]) / 3
              n++
            }
          }
          return n ? sum / n : -1
        },
        changedVsFill(
          data: Uint8ClampedArray,
          dispW: number,
          x0: number,
          y0: number,
          x1: number,
          y1: number,
        ) {
          let changed = 0
          let n = 0
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const i = (y * dispW + x) * 4
              const delta =
                Math.abs(data[i] - 11) + Math.abs(data[i + 1] - 40) + Math.abs(data[i + 2] - 50)
              if (delta > 40) changed++
              n++
            }
          }
          return n ? changed / n : -1
        },
        measure(dispW: number, dispH: number) {
          const world = dispW >= dispH ? { w: 960, h: 540 } : { w: 540, h: 960 }
          const scale = Math.min(dispW / world.w, dispH / world.h)
          const ox = (dispW - world.w * scale) / 2
          const oy = (dispH - world.h * scale) / 2
          const view = { scale, ox, oy, dispW, dispH }
          const canvas = document.createElement('canvas')
          canvas.width = dispW
          canvas.height = dispH
          const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
          if (!ctx) throw new Error('2D canvas context is unavailable')
          ctx.fillStyle = '#0B2832'
          ctx.fillRect(0, 0, dispW, dispH)
          this.withSeed(7, () => scenery.initBorder(view, world, ctx))
          scenery.drawBorderBack(ctx, view, world, 1.25, true, false)
          const data = ctx.getImageData(0, 0, dispW, dispH).data

          const ay0 = Math.round(oy)
          const ay1 = Math.round(oy + world.h * scale)
          const ax0 = Math.round(ox)
          const ax1 = Math.round(ox + world.w * scale)
          return {
            ox: Math.round(ox),
            oy: Math.round(oy),
            skyLum: oy > 8 ? this.luminance(data, dispW, 4, 4, dispW - 4, ay0 - 4) : -1,
            seabedRatio: oy > 8 ? this.changedVsFill(data, dispW, 4, ay1 + 6, dispW - 4, dispH - 2) : -1,
            leftWallRatio: ox > 8 ? this.changedVsFill(data, dispW, 2, 2, ax0 - 4, dispH - 2) : -1,
            rightWallRatio: ox > 8 ? this.changedVsFill(data, dispW, ax1 + 4, 2, dispW - 2, dispH - 2) : -1,
          }
        },
      }

      return {
        laptop1610: h.measure(960, 600),
        tallPhone: h.measure(390, 845),
        tabletPortrait: h.measure(768, 1024),
        ultrawide: h.measure(1260, 540),
      }
    })

    // 16:10 ландшафт: зазор ТОЛЬКО сверху/снизу — светлое небо + осадочное дно.
    expect(results.laptop1610.ox, '16:10: боковых зазоров нет').toBe(0)
    expect(results.laptop1610.oy, '16:10: зазор сверху/снизу есть').toBeGreaterThan(8)
    expect(results.laptop1610.skyLum, '16:10: над полем — светлое небо').toBeGreaterThan(150)
    expect(results.laptop1610.seabedRatio, '16:10: под полем — дно').toBeGreaterThan(0.5)

    // Вытянутый телефон: то же — небо и дно.
    expect(results.tallPhone.ox, '9:19.5: боковых зазоров нет').toBe(0)
    expect(results.tallPhone.skyLum, '9:19.5: небо сверху').toBeGreaterThan(150)
    expect(results.tallPhone.seabedRatio, '9:19.5: дно снизу').toBeGreaterThan(0.5)

    // Портретный планшет 3:4: зазор ТОЛЬКО по бокам — стены водорослей. Порог 2%: стебли —
    // редкие тёмные штрихи (seed 7 даёт ~4% покрытия); «водоросли пропали» = ~0%.
    expect(results.tabletPortrait.oy, '3:4: верх/низ без зазора').toBe(0)
    expect(results.tabletPortrait.leftWallRatio, '3:4: левая стена водорослей').toBeGreaterThan(0.02)
    expect(results.tabletPortrait.rightWallRatio, '3:4: правая стена водорослей').toBeGreaterThan(0.02)

    // Ультравайд 21:9: стены по бокам, неба/дна нет.
    expect(results.ultrawide.oy, '21:9: верх/низ без зазора').toBe(0)
    expect(results.ultrawide.leftWallRatio, '21:9: левая стена водорослей').toBeGreaterThan(0.02)
    expect(results.ultrawide.rightWallRatio, '21:9: правая стена водорослей').toBeGreaterThan(0.02)
  })

  test('draws field kelp behind prey but over the background', async ({ page }) => {
    await openGame(page)
    // Слой полевых водорослей: ПОВЕРХ фона (рисуются в drawBackground после заливки/арта),
    // но ПОД добычей и тюленем (drawPrey/seal.draw идут позже в drawFrame). Контракт ловит
    // порядок слоёв пиксельно: водоросль видна на фоне → рыба, поставленная в ту же точку,
    // перекрывает водоросль.
    const metrics = await page.evaluate(async () => {
      const scenerySpec = '/games/seal-hunt-v1/render/scenery.js'
      const preySpec = '/games/seal-hunt-v1/entities/prey.js'
      const themeSpec = '/games/seal-hunt-v1/core/theme.js'
      const scenery = (await import(/* @vite-ignore */ scenerySpec)) as unknown as SceneryModule
      const prey = (await import(/* @vite-ignore */ preySpec)) as unknown as PreyModule
      const theme = (await import(/* @vite-ignore */ themeSpec)) as unknown as ThemeModule

      const h = {
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
        makePrey(x: number, y: number, scheme: FishScheme): PreyShape {
          return {
            x, y, px: x, py: y, vx: 100, vy: 0, r: 22, t: 0, dir: 1, ang: 0, face: 1,
            sp: { variant: 'round', scheme, prize: true },
            phase: 0, fleeT: 0, restT: 0, tailKick: 0,
          }
        },
      }

      const world = { w: 960, h: 540 }
      const canvas = document.createElement('canvas')
      canvas.width = world.w
      canvas.height = world.h
      const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
      if (!ctx) throw new Error('2D canvas context is unavailable')

      h.withSeed(3, () => scenery.initScenery(world, ctx))
      ctx.fillStyle = '#0B2832'
      ctx.fillRect(0, 0, world.w, world.h)
      const fill = ctx.getImageData(0, 0, world.w, world.h).data
      scenery.drawBackground(ctx, world, 1.25, true, 0)
      const withKelp = ctx.getImageData(0, 0, world.w, world.h).data

      // Водоросли поверх фона: в нижней полосе (корни у пола) должно быть закрашено заметно.
      const kelpBandChanged = h.countChanged(fill, withKelp, world.w, {
        x: 8, y: world.h - 90, w: world.w - 16, h: 80,
      })

      // Точка, где водоросль реально видна → ставим туда рыбу → рыба перекрывает водоросль.
      let kx = -1
      let ky = -1
      outer: for (let y = world.h - 20; y > world.h - 90; y -= 2) {
        for (let x = 12; x < world.w - 12; x += 2) {
          const i = (y * world.w + x) * 4
          const delta =
            Math.abs(withKelp[i] - fill[i]) +
            Math.abs(withKelp[i + 1] - fill[i + 1]) +
            Math.abs(withKelp[i + 2] - fill[i + 2])
          if (delta > 40) { kx = x; ky = y; break outer }
        }
      }
      let preyOverKelpChanged = -1
      if (kx >= 0) {
        prey.PREY.length = 0
        prey.PREY.push(h.makePrey(kx, ky, theme.PALETTE.fish.coral))
        prey.drawPrey(ctx, world, null)
        const withFish = ctx.getImageData(0, 0, world.w, world.h).data
        preyOverKelpChanged = h.countChanged(withKelp, withFish, world.w, {
          x: Math.max(0, kx - 24), y: Math.max(0, ky - 18), w: 48, h: 36,
        })
      }
      return { kelpBandChanged, foundKelp: kx >= 0, preyOverKelpChanged }
    })

    expect(metrics.kelpBandChanged, 'полевые водоросли видны поверх фона').toBeGreaterThan(300)
    expect(metrics.foundKelp, 'нашлась точка с водорослью для проверки порядка').toBe(true)
    expect(metrics.preyOverKelpChanged, 'рыба закрашивает водоросль (рыба выше слоем)').toBeGreaterThan(150)
  })

  test('fades prey by overhang distance and dissolves them before the sim cull', async ({ page }) => {
    await openGame(page)
    // Контракт фейда: внутри поля — полная непрозрачность; за краем альфа падает линейно и
    // к 38 lu (< sim-кулла 40) рыба полностью растворена — сам кулл невидим. Механика
    // (позиции/кулл) закреплена отдельно в tests/unit/seal-hunt-prey-edges.unit.spec.ts.
    const sums = await page.evaluate(async () => {
      const preySpec = '/games/seal-hunt-v1/entities/prey.js'
      const themeSpec = '/games/seal-hunt-v1/core/theme.js'
      const prey = (await import(/* @vite-ignore */ preySpec)) as unknown as PreyModule
      const theme = (await import(/* @vite-ignore */ themeSpec)) as unknown as ThemeModule

      const world = { w: 180, h: 150 }
      const ox = 70
      const oy = 10

      const h = {
        makeFish(x: number, y: number): PreyShape {
          return {
            x, y, px: x, py: y, vx: 100, vy: 0, r: 20, t: 0, dir: 1, ang: 0, face: 1,
            sp: { variant: 'round', scheme: theme.PALETTE.fish.coral, prize: false },
            phase: 0, fleeT: 0, restT: 0, tailKick: 0,
          }
        },
        alphaSum(
          data: Uint8ClampedArray,
          width: number,
          rect: { x: number; y: number; w: number; h: number },
        ) {
          let sum = 0
          for (let y = rect.y; y < rect.y + rect.h; y++) {
            for (let x = rect.x; x < rect.x + rect.w; x++) {
              sum += data[(y * width + x) * 4 + 3]
            }
          }
          return sum
        },
      }

      const canvas = document.createElement('canvas')
      canvas.width = 330
      canvas.height = 180
      const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })
      if (!ctx) throw new Error('2D canvas context is unavailable')

      prey.PREY.length = 0
      prey.PREY.push(h.makeFish(90, 40), h.makeFish(-30, 80), h.makeFish(-39, 120))
      ctx.save()
      ctx.translate(ox, oy)
      prey.drawPrey(ctx, world, null)
      ctx.restore()
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data

      return {
        inside: h.alphaSum(data, canvas.width, { x: ox + 90 - 45, y: oy + 40 - 24, w: 90, h: 48 }),
        over30: h.alphaSum(data, canvas.width, { x: ox - 30 - 45, y: oy + 80 - 24, w: 90, h: 48 }),
        over39: h.alphaSum(data, canvas.width, { x: ox - 39 - 45, y: oy + 120 - 24, w: 90, h: 48 }),
      }
    })

    expect(sums.inside, 'рыба внутри поля рисуется в полную силу').toBeGreaterThan(10_000)
    expect(sums.over30, 'на 30 lu за краем рыба ещё видна').toBeGreaterThan(sums.inside * 0.04)
    expect(sums.over30, 'на 30 lu за краем рыба ЗАМЕТНО прозрачнее').toBeLessThan(sums.inside * 0.6)
    expect(sums.over39, 'на 39 lu (за EDGE_FADE_LU=38) рыба полностью растворена').toBe(0)
  })

  test('marks surface crossings with a ripple (флоп-плюх контракт)', async ({ page }) => {
    await openGame(page)
    // Рябь у ватерлинии — маркер «нырнула/ушла за поверхность»: с ripples:true у линии воды
    // появляются пиксели кольца, без ripples — там пусто (тело за поверхностью клипнуто).
    const metrics = await page.evaluate(async () => {
      const preySpec = '/games/seal-hunt-v1/entities/prey.js'
      const themeSpec = '/games/seal-hunt-v1/core/theme.js'
      const prey = (await import(/* @vite-ignore */ preySpec)) as unknown as PreyModule
      const theme = (await import(/* @vite-ignore */ themeSpec)) as unknown as ThemeModule

      const world = { w: 180, h: 120 }
      const ox = 30
      const waterY = 60

      const h = {
        makeFish(y: number): PreyShape {
          return {
            x: world.w * 0.5, y, px: world.w * 0.5, py: y, vx: 0, vy: -120, r: 20, t: 0,
            dir: 1, ang: -Math.PI / 2, face: 1,
            sp: { variant: 'round', scheme: theme.PALETTE.fish.coral, prize: false },
            phase: 0, fleeT: 0, restT: 0, tailKick: 0,
          }
        },
        countBand(ripples: boolean, y0: number, y1: number) {
          const canvas = document.createElement('canvas')
          canvas.width = 240
          canvas.height = 170
          const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })
          if (!ctx) throw new Error('2D canvas context is unavailable')
          prey.PREY.length = 0
          prey.PREY.push(this.makeFish(-20)) // прорвалась за поверхность, ещё в зоне ряби
          ctx.save()
          ctx.translate(ox, waterY)
          prey.drawPrey(ctx, world, { ripples })
          ctx.restore()
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
          let pixels = 0
          for (let y = y0; y < y1; y++) {
            for (let x = ox; x < ox + world.w; x++) {
              if (data[(y * canvas.width + x) * 4 + 3] > 16) pixels++
            }
          }
          return pixels
        },
      }

      return {
        rippleOn: h.countBand(true, waterY - 7, waterY + 8),
        rippleOff: h.countBand(false, waterY - 7, waterY + 8),
      }
    })

    // Дифференциальный контракт: у прорвавшейся рыбы ХВОСТ легитимно остаётся под линией
    // (rotate: у вертикальной рыбы хвост тянется вниз в воду — это желанный look), поэтому
    // сравниваем ту же сцену с ripples и без: кольцо ДОБАВЛЯЕТ пиксели у ватерлинии.
    expect(metrics.rippleOn, 'кольцо-рябь рисуется у ватерлинии').toBeGreaterThan(25)
    expect(
      metrics.rippleOn - metrics.rippleOff,
      'ripples:true добавляет кольцо поверх той же сцены',
    ).toBeGreaterThan(25)
  })
})
