import { test, expect, type Page } from '@playwright/test'

/**
 * ⚡ SH-13: визуальные контракты молниевой звезды — редкий бафф-пикап должен ЧИТАТЬСЯ:
 * светящийся ореол (единственная «светящаяся» добыча) и зигзаг-силуэт, отличный от обычной
 * морской звезды не только цветом. Реальные canvas-пиксели, как в game-visual-borders.
 */

const GAME = 'http://localhost:3000/games/seal-hunt-v1/index.html?game=seal-the-hunter&lang=en'

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
  sp: { variant: string; scheme: FishScheme & { glow?: string; spark?: string }; prize?: boolean }
  phase: number
  fleeT: number
  restT: number
  tailKick: number
  starT?: number
}
type PreyModule = {
  PREY: PreyShape[]
  drawPrey: (
    ctx: CanvasRenderingContext2D,
    world: { w: number; h: number },
    surf?: { ripples: boolean } | null,
  ) => void
}
type ThemeModule = {
  PALETTE: { fish: Record<string, FishScheme & { glow?: string; spark?: string }> }
}

async function openGame(page: Page) {
  // Стаб __name: tsx/esbuild keepNames в CI оборачивает функции, Playwright сериализует
  // evaluate-колбэки без bundle-scope (см. game-visual-borders.e2e.spec.ts / память проекта).
  await page.addInitScript({ content: 'globalThis.__name = globalThis.__name || ((f) => f);' })
  await page.goto(GAME)
  await page.waitForFunction(() => Boolean((window as unknown as { SealI18n?: unknown }).SealI18n))
}

test.describe('Seal The Hunter — lightning sea star visuals', () => {
  test('glows beyond its body and reads brighter than a regular star', async ({ page }) => {
    await openGame(page)

    const metrics = await page.evaluate(async () => {
      const preySpec = '/games/seal-hunt-v1/entities/prey.js'
      const themeSpec = '/games/seal-hunt-v1/core/theme.js'
      const prey = (await import(/* @vite-ignore */ preySpec)) as unknown as PreyModule
      const theme = (await import(/* @vite-ignore */ themeSpec)) as unknown as ThemeModule

      // Хелперы — метод-шортхенды (никаких именованных const-arrow: esbuild keepNames).
      const h = {
        makeStar(variant: string, scheme: FishScheme): PreyShape {
          return {
            x: 90, y: 90, px: 90, py: 90, vx: 0, vy: 0, r: 17, t: 0, dir: 1, ang: 0, face: 1,
            sp: { variant, scheme, prize: true },
            phase: 0, fleeT: 0, restT: 0, tailKick: 0,
          }
        },
        render(variant: string, scheme: FishScheme) {
          const canvas = document.createElement('canvas')
          canvas.width = 180
          canvas.height = 180
          const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })
          if (!ctx) throw new Error('2D canvas context is unavailable')
          prey.PREY.length = 0
          prey.PREY.push(this.makeStar(variant, scheme))
          prey.drawPrey(ctx, { w: 180, h: 180 }, null)
          return ctx.getImageData(0, 0, 180, 180).data
        },
        ringStats(data: Uint8ClampedArray, rMin: number, rMax: number) {
          // пиксели в кольце вокруг центра (90,90): считаем «зажжённые» и их среднюю яркость
          let lit = 0
          let lum = 0
          for (let y = 0; y < 180; y++) {
            for (let x = 0; x < 180; x++) {
              const d = Math.hypot(x - 90, y - 90)
              if (d < rMin || d > rMax) continue
              const i = (y * 180 + x) * 4
              if (data[i + 3] > 12) {
                lit++
                lum += (data[i] + data[i + 1] + data[i + 2]) / 3
              }
            }
          }
          return { lit, meanLum: lit ? lum / lit : 0 }
        },
      }

      const lightning = h.render('lightning', theme.PALETTE.fish.lightning)
      const regular = h.render('star', theme.PALETTE.fish.sand)

      return {
        // ореол: кольцо ЗА пределами тела (17 lu) — у молниевой должно светиться
        lightningHalo: h.ringStats(lightning, 24, 34),
        regularHalo: h.ringStats(regular, 24, 34),
        // ядро: молниевая заметно ярче обычной звезды
        lightningCore: h.ringStats(lightning, 0, 12),
        regularCore: h.ringStats(regular, 0, 12),
      }
    })

    // Свечение выходит за тело — единственная «светящаяся» добыча (маркер редкости).
    expect(
      metrics.lightningHalo.lit,
      'ореол молниевой звезды светится за пределами тела',
    ).toBeGreaterThan(300)
    expect(
      metrics.lightningHalo.lit,
      'у обычной звезды такого ореола нет (различимость)',
    ).toBeGreaterThan(metrics.regularHalo.lit * 3)

    // Ядро — электрически-светлое (жёлто-белое): абсолютная яркость, без сравнения со схемой
    // обычной звезды (песочная сама светлая — сравнение хрупко; различимость держит ОРЕОЛ выше).
    expect(metrics.lightningCore.meanLum).toBeGreaterThan(180)
    expect(metrics.lightningCore.lit, 'ядро реально закрашено').toBeGreaterThan(150)
  })

  test('warns before expiry: the star fades in its last STAR.fadeMs window', async ({ page }) => {
    await openGame(page)

    const sums = await page.evaluate(async () => {
      const preySpec = '/games/seal-hunt-v1/entities/prey.js'
      const themeSpec = '/games/seal-hunt-v1/core/theme.js'
      const prey = (await import(/* @vite-ignore */ preySpec)) as unknown as PreyModule
      const theme = (await import(/* @vite-ignore */ themeSpec)) as unknown as ThemeModule

      const h = {
        alphaSum(starT: number) {
          const canvas = document.createElement('canvas')
          canvas.width = 160
          canvas.height = 160
          const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })
          if (!ctx) throw new Error('2D canvas context is unavailable')
          prey.PREY.length = 0
          prey.PREY.push({
            x: 80, y: 80, px: 80, py: 80, vx: 0, vy: 0, r: 17, t: 0, dir: 1, ang: 0, face: 1,
            sp: { variant: 'lightning', scheme: theme.PALETTE.fish.lightning, prize: true },
            phase: 0, fleeT: 0, restT: 0, tailKick: 0, starT,
          })
          prey.drawPrey(ctx, { w: 160, h: 160 }, null)
          const data = ctx.getImageData(0, 0, 160, 160).data
          let sum = 0
          for (let i = 3; i < data.length; i += 4) sum += data[i]
          return sum
        },
      }
      return { fresh: h.alphaSum(9), expiring: h.alphaSum(0.4) }
    })

    expect(sums.fresh).toBeGreaterThan(10_000)
    expect(
      sums.expiring,
      'в последние секунды звезда заметно тает (окно закрывается)',
    ).toBeLessThan(sums.fresh * 0.5)
    expect(sums.expiring, 'но ещё видима — успеть можно').toBeGreaterThan(0)
  })
})
