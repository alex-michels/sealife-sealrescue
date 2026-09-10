import { test, expect } from '@playwright/test'
import { RULES_VERSION } from '../../public/games/seal-run-v1/core/biomes.js'
import { generateRound, courseHash } from '../../public/games/seal-run-v1/core/course.js'

const origin = process.env.SEAL_RUN_STATIC ? 'http://127.0.0.1:4173' : 'http://localhost:3000'
const url = origin + '/games/seal-run-v1/index.html?lang=en&seed=playtest'
async function config(page: import('@playwright/test').Page) {
  await page.route('**/api/game-config?*', (route) => route.fulfill({ json: { standalone: true } }))
}
test('SR-07/11: lazy engine, explicit preferences, five routes and RU/EN only', async ({
  page,
}) => {
  await config(page)
  const requests: string[] = []
  page.on('request', (r) => requests.push(r.url()))
  await page.goto(url + '&unused=1')
  await expect(page.locator('#start')).toBeEnabled()
  expect(requests.some((r) => r.includes('vendor/phaser'))).toBe(false)
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
  await expect(page.locator('[data-biome]')).toHaveCount(5)
  await page.locator('[data-biome="arctic"]').click()
  await expect(page.locator('#location-species')).toHaveText('Ringed seal')
  await page.locator('[data-lang="ru"]').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.locator('#location-species')).toHaveText('Кольчатая нерпа')
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['seal_run_lang'])
  await expect(page.locator('[data-lang="de"]')).toHaveCount(0)
})
test('SR-14: browser and server generate identical five-chapter courses', async ({ page }) => {
  await config(page)
  await page.goto(url)
  const expected = Array.from({ length: 5 }, (_, i) => courseHash(generateRound('2026-W36', i)))
  const hashes = await page.evaluate(async () => {
    const moduleUrl = location.origin + '/games/seal-run-v1/core/course.js'
    const mod = await import(moduleUrl)
    return Array.from({ length: 5 }, (_, i) => mod.courseHash(mod.generateRound('2026-W36', i)))
  })
  expect(hashes).toEqual(expected)
})
test('SR-07/15: keyboard, burst, pause, focus trap and read-only snapshots', async ({ page }) => {
  await config(page)
  await page.goto(url)
  await page.locator('#start').click()
  await expect(page.locator('#stage canvas')).toBeVisible()
  await page.waitForFunction(() => (window.SealRun?.state?.d ?? 0) > 100)
  const initial = await page.evaluate(() => window.SealRun!.state!.y)
  await page.keyboard.down('ArrowUp')
  await page.waitForFunction((y) => window.SealRun!.state!.y < y - 30, initial)
  await page.keyboard.up('ArrowUp')
  await page.keyboard.press('Space')
  await page.waitForFunction(() => window.SealRun!.state!.burstReadyMs > 0)
  await page.keyboard.press('Escape')
  await expect(page.locator('#resume')).toBeFocused()
  const snapshot = await page.evaluate(() => window.SealRun!.state)
  await page.evaluate(() => {
    const s = window.SealRun!.state!
    s.d = 99999
    window.dispatchEvent(new Event('blur'))
  })
  await expect.poll(() => page.evaluate(() => window.SealRun!.state!.d)).toBe(snapshot!.d)
  await page.locator('#pause-settings button').first().focus()
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('#end-swim')).toBeFocused()
  await page.locator('#end-swim').click()
  await expect(page.locator('#over')).toBeVisible()
  await expect(page.locator('#submit-score')).toBeHidden()
  await expect(page.locator('#result-mode')).toContainText('Practice')
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
})
test('SR-07: portrait and landscape retain identical playfield and usable controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await config(page)
  await page.goto(url)
  await page.locator('[data-biome="tropical"]').click()
  await page.locator('#start').click()
  await expect(page.locator('#stage canvas')).toBeVisible()
  await page.waitForFunction(() => (window.SealRun?.state?.d ?? 0) > 50)
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size)
    await expect
      .poll(async () => {
        const r = await page.locator('#stage canvas').boundingBox()
        return r!.width / r!.height
      })
      .toBeCloseTo(960 / 540, 1)
    await expect
      .poll(async () => {
        const canvas = await page.locator('#stage canvas').boundingBox()
        const hud = await page.locator('#hud').boundingBox()
        const controls = await page.locator('#play-controls').boundingBox()
        const buttons = await page.locator('#play-controls button').all()
        const clear = await Promise.all(
          buttons.map(async (button) => {
            const b = (await button.boundingBox())!
            return (
              b.x + b.width <= canvas!.x ||
              b.x >= canvas!.x + canvas!.width ||
              b.y >= canvas!.y + canvas!.height
            )
          }),
        )
        return canvas!.y >= hud!.y + hud!.height - 1 && clear.every(Boolean) && controls!.height > 0
      })
      .toBe(true)
    await expect(page.locator('#hud [data-lang=ru]')).toBeVisible()
    const burst = await page.locator('#burst').boundingBox()
    expect(burst!.width).toBeGreaterThanOrEqual(24)
    expect(burst!.height).toBeGreaterThanOrEqual(24)
    expect(burst!.x + burst!.width).toBeLessThanOrEqual(size.width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    )
  }
})
test('SR-11: API failure is recoverable, empty/paged board and offline practice', async ({
  page,
  context,
}) => {
  await config(page)
  await page.route('**/api/leaderboard/start?*', (route) =>
    route.fulfill({ status: 503, json: { error: 'offline' } }),
  )
  await page.route('**/api/leaderboard?*', (route) =>
    route.fulfill({ json: { season: '2026-W36', personalBest: 42, top: [], hasMore: false } }),
  )
  await page.goto(url)
  await page.locator('#mode-weekly').click()
  await page.locator('#start').click()
  await expect(page.locator('#start-error')).toBeVisible()
  await expect(page.locator('#menu')).toBeVisible()
  await page.locator('#board-open').click()
  await expect(page.locator('#board-status')).toContainText('quiet')
  await expect(page.locator('#personal-best')).toContainText('42')
  await page.locator('#board-close').click()
  await page.locator('#mode-explore').click()
  await expect(page.locator('#start-error')).toBeHidden()
  await page.locator('#start').click()
  await expect(page.locator('#stage canvas')).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('#start')).toBeEnabled({ timeout: 30000 })
  await page.locator('#start').click()
  await expect(page.locator('#stage canvas')).toBeVisible()
})
// The production bridge returns cloned snapshots and exposes no stepping/mutation API.
declare global {
  interface Window {
    SealRun?: {
      state: null | { y: number; d: number; tMs: number; phase: string; burstReadyMs: number }
      view: string
    }
  }
}

test('SR-16/20: finish freezes the simulation and all five chapters advance', async ({ page }) => {
  // Short-course fixture exercises the real finish/render/controller path without
  // rasterising 90 seconds of software WebGL. Full 900 m budgets run in the Node bot suite.
  test.setTimeout(180000)
  await page.setViewportSize({ width: 640, height: 480 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await config(page)
  await page.route('**/core/course.js', async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replace(
      'export const COURSE_LENGTH_LU = 36000;',
      'export const COURSE_LENGTH_LU = 400;',
    )
    expect(body).toContain('COURSE_LENGTH_LU = 400')
    await route.fulfill({ response, body, contentType: 'text/javascript' })
  })
  await page.goto(url)
  await page.locator('#start').click()
  for (let chapter = 1; chapter <= 5; chapter++) {
    await expect(page.locator('#over')).toBeVisible({ timeout: 30000 })
    const result = await page.evaluate(() => window.SealRun!.state)
    expect(result!.phase).toBe('finished')
    expect(result!.d).toBe(400)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    expect(await page.evaluate(() => window.SealRun!.state)).toEqual(result)
    if (chapter < 5) {
      await page.locator('#next-round').click()
      await expect(page.locator('#hud-chapter')).toHaveText('Chapter ' + (chapter + 1) + ' / 5')
    } else await expect(page.locator('#next-round')).toBeHidden()
  }
  await expect(page.locator('#over-title')).toHaveText('Five waters. One great swim.')
  await expect(page.locator('#r-levels')).toHaveText('5 / 5')
})

test('SR-09/10: weekly result sends derived chapter stats and retries a failed save', async ({
  page,
}) => {
  await config(page)
  await page.route('**/api/leaderboard/start?*', (route) =>
    route.fulfill({
      json: {
        token: 'test-signed-ticket',
        seed: 42,
        season: '2026-W36',
        courseSeed: '2026-W36',
        rulesVersion: RULES_VERSION,
        parts: { noun: 0 },
      },
    }),
  )
  let attempts = 0
  const bodies: Array<{ score: number; durationMs: number; rounds: unknown[] }> = []
  await page.route('**/api/leaderboard', async (route) => {
    bodies.push(route.request().postDataJSON())
    attempts++
    await route.fulfill(
      attempts === 1
        ? { status: 503, json: { error: 'unavailable' } }
        : { json: { rank: 1, score: bodies[0].score } },
    )
  })
  await page.goto(url)
  await page.locator('#mode-weekly').click()
  await page.locator('#start').click()
  await page.waitForFunction(() => (window.SealRun?.state?.tMs ?? 0) > 3500)
  await page.locator('#pause-button').click()
  await page.locator('#end-swim').click()
  await page.locator('#submit-score').click()
  await expect(page.locator('#submit-status')).toContainText('not saved')
  await page.locator('#submit-score').click()
  await expect(page.locator('#submit-status')).toContainText('on the board')
  expect(bodies).toHaveLength(2)
  expect(bodies[0]).toEqual(bodies[1])
  expect(bodies[0].rounds).toHaveLength(1)
  expect(bodies[0].durationMs).toBeGreaterThanOrEqual(3000)
  await expect(page.locator('#submit-score')).toBeHidden()
})

test('SR-06: the visible phocid torso covers the collision circle in every coat', async ({
  page,
}) => {
  await config(page)
  await page.goto(url)
  const gaps = await page.evaluate(async () => {
    const { drawPhocid } = await import(location.origin + '/games/seal-run-v1/render/expedition.js')
    const { TEXTURES } = await import(location.origin + '/games/seal-run-v1/core/theme.js')
    const { SEAL_R } = await import(location.origin + '/games/seal-run-v1/core/course.js')
    const { w, h, originY } = TEXTURES.seal
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const c = canvas.getContext('2d')!,
      missing: string[] = []
    for (const coat of ['spotted', 'ringed', 'monk', 'weddell']) {
      c.clearRect(0, 0, w, h)
      drawPhocid(c, w, h, coat)
      for (let i = 0; i < 32; i++) {
        const angle = (i * Math.PI * 2) / 32,
          x = Math.round(w / 2 + SEAL_R * Math.cos(angle)),
          y = Math.round(h * originY + SEAL_R * Math.sin(angle))
        if (c.getImageData(x, y, 1, 1).data[3] < 128) missing.push(coat + ':' + i)
      }
    }
    return missing
  })
  expect(gaps).toEqual([])
})

test('SR-07: RU menu contains the entire seal and separates its caption from route cards', async ({
  page,
}) => {
  await config(page)
  await page.goto(url.replace('lang=en', 'lang=ru'))
  await expect(page.locator('#start')).toBeEnabled()
  await page.getByRole('button', { name: '05 / Синяя Антарктида', exact: true }).click()
  await expect(page.locator('.location-note')).toContainText('Малыш Уэдделла')
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1238, height: 1267 },
    { width: 900, height: 1200 },
    { width: 390, height: 844 },
    { width: 320, height: 740 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size)
    const layout = await page.evaluate(() => {
      // Anonymous callbacks survive the CI tsx/esbuild serialization boundary.
      const [seal, caption, cards, copy, launch] = [
        '#seal-portrait',
        '.location-note',
        '#biome-map',
        '.hero-copy',
        '.launch-panel',
      ].map((selector) => {
        const r = document.querySelector(selector)!.getBoundingClientRect()
        return {
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        }
      })
      return {
        seal,
        caption,
        cards,
        copy,
        launch,
        scrollWidth: document.documentElement.scrollWidth,
      }
    })
    expect(layout.seal.left).toBeGreaterThanOrEqual(0)
    expect(layout.seal.right).toBeLessThanOrEqual(size.width)
    expect(layout.seal.width / layout.seal.height).toBeCloseTo(1080 / 576, 2)
    expect(layout.caption.top).toBeGreaterThanOrEqual(layout.seal.bottom - 1)
    expect(layout.caption.bottom).toBeLessThanOrEqual(layout.cards.top)
    expect(layout.scrollWidth).toBeLessThanOrEqual(size.width)
    // No text/button block intersects the animal, even when the menu scrolls vertically.
    for (const box of [layout.copy, layout.launch]) {
      expect(
        box.right <= layout.seal.left ||
          box.left >= layout.seal.right ||
          box.bottom <= layout.seal.top ||
          box.top >= layout.seal.bottom,
      ).toBe(true)
    }
  }
})

test('SR-06: distinct tail remains between webbed hindflippers throughout the stroke', async ({
  page,
}) => {
  await page.goto(url)
  const samples = await page.evaluate(async () => {
    const { drawPhocid } = await import(location.origin + '/games/seal-run-v1/render/expedition.js')
    const canvas = document.createElement('canvas')
    canvas.width = 360
    canvas.height = 192
    const c = canvas.getContext('2d')!
    return Array.from({ length: 8 }, (_, i) => {
      c.clearRect(0, 0, 360, 192)
      drawPhocid(c, 360, 192, 'spotted', i / 8)
      // A cross-section through the short tail tip must show three distinct
      // silhouettes: far webbed foot, tail, near webbed foot, separated by water.
      const runs: number[][] = []
      let start = -1
      for (let y = 5; y < 91; y++) {
        const opaque = c.getImageData(52, y * 2, 1, 1).data[3] > 128
        if (opaque && start < 0) start = y
        if (!opaque && start >= 0) {
          runs.push([start, y - 1])
          start = -1
        }
      }
      return runs
    })
  })
  for (const runs of samples) {
    expect(runs).toHaveLength(3)
    expect(runs[1][0]).toBeLessThanOrEqual(51)
    expect(runs[1][1]).toBeGreaterThanOrEqual(51)
    expect(runs[1][1] - runs[1][0]).toBeLessThan(runs[0][1] - runs[0][0])
    expect(runs[1][1] - runs[1][0]).toBeLessThan(runs[2][1] - runs[2][0])
  }
})

test('SR-11: practice loading failures do not blame the weekly route', async ({ page }) => {
  await config(page)
  await page.route('**/vendor/phaser.esm.js', (route) => route.abort())
  await page.goto(url.replace('lang=en', 'lang=ru'))
  await page.locator('#start').click()
  await expect(page.locator('#start-error')).toHaveText(
    'Не удалось загрузить игру. Попробуй ещё раз.',
  )
  await expect(page.locator('#start')).toBeEnabled()
})

test('SR-12: directory entry reaches the game and preserves explicit language', async ({
  page,
}) => {
  test.skip(Boolean(process.env.SEAL_RUN_STATIC), 'Production Next.js redirect, covered in full CI')
  await config(page)
  await page.goto(origin + '/games/seal-run-v1/?lang=ru&seed=directory')
  await expect(page).toHaveURL(origin + '/games/seal-run-v1/index.html?lang=ru&seed=directory')
  await expect(page.locator('#start')).toBeEnabled()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
})

test('SR-06: every generated swim frame covers its collision circle and has real transparency', async ({
  page,
}) => {
  await config(page)
  await page.goto(url)
  const report = await page.evaluate(async () => {
    const root = location.origin + '/games/seal-run-v1/'
    const { buildExpeditionTextures } = await import(root + 'render/expedition.js')
    const { buildHazardTextures, loadHazardArt, hazardFrame, hazardTexture } = await import(
      root + 'render/hazards.js'
    )
    const { actorSize, faunaId } = await import(root + 'core/fauna.js')
    const { OBSTACLE_DIMS } = await import(root + 'core/course.js')
    const textures = new Map<string, HTMLCanvasElement>()
    const scene = {
      textures: {
        exists(key: string) {
          return textures.has(key)
        },
        addCanvas(key: string, canvas: HTMLCanvasElement) {
          textures.set(key, canvas)
        },
        addAtlas(
          _key: string,
          image: CanvasImageSource,
          data: {
            frames: Record<
              string,
              {
                frame: { x: number; y: number; w: number; h: number }
                sourceSize?: { w: number; h: number }
                spriteSourceSize?: { x: number; y: number; w: number; h: number }
              }
            >
          },
        ) {
          for (const [key, entry] of Object.entries(data.frames)) {
            const f = entry.frame,
              size = entry.sourceSize ?? f
            const trim = entry.spriteSourceSize ?? { x: 0, y: 0, w: f.w, h: f.h }
            const c = document.createElement('canvas')
            c.width = size.w
            c.height = size.h
            c.getContext('2d')!.drawImage(image, f.x, f.y, f.w, f.h, trim.x, trim.y, trim.w, trim.h)
            textures.set(key, c)
          }
        },
      },
      events: { once() {} },
    }
    buildExpeditionTextures(scene, 'antarctic')
    for (const biome of ['coastal', 'atlantis', 'tropical', 'arctic', 'antarctic']) {
      await loadHazardArt(biome)
      buildHazardTextures(scene, biome)
    }
    const missing: string[] = []
    for (const [kind, biome] of [
      ['shark_white', 'coastal'],
      ['shark_big', 'coastal'],
      ['shark_white', 'tropical'],
      ['shark_big', 'tropical'],
      ['orca', 'coastal'],
      ['orca', 'antarctic'],
      ['seal', 'atlantis'],
      ['seal', 'antarctic'],
      ['polar_bear', 'arctic'],
      ['leopard_seal', 'antarctic'],
      ['leopard_seal_big', 'antarctic'],
    ]) {
      const { w, h, originX = 0.5, originY = 0.5 } = actorSize(kind, biome)
      const radius = kind === 'seal' ? 24 : OBSTACLE_DIMS[kind].r
      const frameCount = 4
      for (let frame = 0; frame < frameCount; frame++) {
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(w)
        canvas.height = Math.ceil(h)
        const c = canvas.getContext('2d')!
        const key = hazardTexture(kind, biome) + '_' + frame
        const source = textures.get(key)!
        c.drawImage(source, 0, 0, w, h)
        if (faunaId(kind, biome)) {
          // Corner transparency alone misses a neighbouring atlas frame's tail
          // leaking ahead of the snout. Inspect the complete source alpha plane.
          const pixels = source
            .getContext('2d')!
            .getImageData(0, 0, source.width, source.height).data
          const seen = new Uint8Array(source.width * source.height)
          const components: number[] = []
          for (let p = 0; p < seen.length; p++) {
            if (seen[p] || pixels[p * 4 + 3] <= 8) continue
            const queue = [p]
            seen[p] = 1
            for (let j = 0; j < queue.length; j++) {
              const x = queue[j] % source.width,
                y = Math.floor(queue[j] / source.width)
              for (let dy = -1; dy <= 1; dy++)
                for (let dx = -1; dx <= 1; dx++) {
                  const xx = x + dx,
                    yy = y + dy,
                    n = yy * source.width + xx
                  if (
                    xx < 0 ||
                    yy < 0 ||
                    xx >= source.width ||
                    yy >= source.height ||
                    seen[n] ||
                    pixels[n * 4 + 3] <= 8
                  )
                    continue
                  seen[n] = 1
                  queue.push(n)
                }
            }
            if (queue.length > 2) components.push(queue.length)
          }
          if (components.length !== 1) missing.push(key + ':stray-alpha:' + components.join(','))
        }
        for (let i = 0; i < 32; i++) {
          const a = (i * Math.PI) / 16
          if (
            c.getImageData(
              Math.round(w * originX + radius * Math.cos(a)),
              Math.round(h * originY + radius * Math.sin(a)),
              1,
              1,
            ).data[3] < 128
          )
            missing.push(key + ':' + i)
        }
        if (c.getImageData(0, 0, 1, 1).data[3] > 8) missing.push(key + ':opaque-background')
      }
    }
    const distinct = new Set(
      ['coastal', 'atlantis', 'tropical', 'arctic', 'antarctic'].map((b) =>
        textures.get('boat_' + b + '_hull')!.toDataURL(),
      ),
    ).size
    const animated = ['polar_bear', 'leopard_seal', 'boat_arctic', 'weddell-pup'].every(
      (k) => textures.get(k + '_0')!.toDataURL() !== textures.get(k + '_1')!.toDataURL(),
    )
    const reduced =
      hazardFrame('boat_propeller', 'arctic', 1000, true) === 'boat_arctic_0' &&
      hazardFrame('polar_bear', 'arctic', 1000, true) === 'polar_bear_0' &&
      hazardFrame('seal', 'antarctic', 1000, true) === 'weddell-pup_0'
    return { missing, distinct, animated, reduced }
  })
  expect(report).toEqual({ missing: [], distinct: 5, animated: true, reduced: true })
})

test('SR-05/14: every full-length biome renders its rocks and hazards without stopping', async ({
  page,
}) => {
  test.setTimeout(120000)
  await config(page)
  await page.goto(url)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const report = await page.evaluate(async () => {
    const root = location.origin + '/games/seal-run-v1/'
    const Phaser = (await import(root + 'vendor/phaser.esm.js')).default
    const { createPlayScene } = await import(root + 'render/scene.js')
    const { generateCourse } = await import(root + 'core/course.js')
    const { createSim } = await import(root + 'core/sim.js')
    const { loadScenery } = await import(root + 'render/scenery.js')
    const { loadHazardArt } = await import(root + 'render/hazards.js')
    const host = document.createElement('div')
    document.body.replaceChildren(host)
    const results = []
    for (const biome of ['coastal', 'atlantis', 'tropical', 'arctic', 'antarctic']) {
      await Promise.all([loadScenery(biome), loadHazardArt(biome)])
      const course = generateCourse('renderer-regression', biome)
      const state = createSim(course)
      const Play = createPlayScene(Phaser, {
        state,
        course,
        currentCtrl() {
          return {}
        },
        updateHud() {},
        onEvents() {},
        onEnd() {},
        isPaused() {
          return false
        },
        isReduced() {
          return false
        },
      })
      const game = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: host,
        width: 960,
        height: 540,
        audio: { noAudio: true },
        scene: [Play],
      })
      while (!game.scene.getScene('play')?.scenery)
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      game.loop.stop()
      const play = game.scene.getScene('play')
      const scenery = play.scenery
      const worldBefore = state.worldD
      state.debrisUntilMs = state.tMs + 2000
      for (let tick = 0; tick < 120; tick++) play.update(0, 1000 / 120)
      const playerDrifts =
        play.seal.x < 160 &&
        state.worldD > worldBefore + 230 &&
        Math.abs(play.seal.x - (240 - state.lag)) < 3
      const predators = state.predators
      state.predators = [{ type: 'boat_propeller', atLu: 0, band: 1 }]
      play.syncWorld(650)
      const boat = play.bound.get('p0')?.spr
      const wholeHullRetained = boat?.visible === true && boat.rotor?.visible === true
      const rotorAligned =
        boat && boat.x === boat.rotor.x && boat.y === boat.rotor.y && boat.rotor.displayWidth === 96
      state.predators = predators
      state.debrisUntilMs = 0
      state.lag = 0
      scenery.update(0, 0, 'rich')
      const start = scenery.panorama.x
      const moving = scenery.props.filter((prop: { base: number }) => prop.base > 1000)
      const before = moving.map((prop: { sprite: { x: number } }) => prop.sprite.x)
      scenery.update(100, 1000, 'rich')
      const shifts = moving.map(
        (prop: { sprite: { x: number }; plane: { depth: number } }, i: number) => ({
          shift: before[i] - prop.sprite.x,
          depth: prop.plane.depth,
        }),
      )
      const frozen = [
        scenery.panorama.x,
        ...scenery.props.map((p: { sprite: { x: number } }) => p.sprite.x),
      ]
      scenery.setPaused(true, 'minimum')
      scenery.update(200, 2000, 'minimum')
      const reducedFrozen =
        JSON.stringify(frozen) ===
          JSON.stringify([
            scenery.panorama.x,
            ...scenery.props.map((p: { sprite: { x: number } }) => p.sprite.x),
          ]) &&
        !scenery.motes.active &&
        !scenery.motes.visible &&
        !scenery.shimmer.visible
      const kinds = new Set<string>()
      // Sweep the whole genuine 900 m course, including dynamically named biome rocks.
      for (let distance = 0; distance <= course.lengthLu; distance += 300) {
        state.d = distance
        state.worldD = distance
        play.syncWorld(distance)
        scenery.update(distance, distance * 3, 'rich')
        for (const rec of play.bound.values()) kinds.add(rec.kind)
      }
      scenery.update(course.lengthLu, 120000, 'rich')
      results.push({
        biome,
        kinds: [...kinds],
        start,
        shifts,
        reducedFrozen,
        released: false,
        endRight: scenery.panorama.x + scenery.panorama.displayWidth,
        panoramaWidth: scenery.panorama.displayWidth,
        playerDrifts,
        wholeHullRetained,
        rotorAligned,
        particlesBounded: scenery.motes.maxParticles <= 36,
      })
      game.scene.stop('play')
      const released = !game.textures.exists('panorama_' + biome)
      results.at(-1)!.released = released
      game.destroy(true)
      // A stopped RAF loop must be given one step to process Phaser's queued destruction.
      game.runDestroy()
    }
    return results
  })
  expect(errors).toEqual([])
  for (const row of report) {
    expect(row.kinds).toContain('rock_' + row.biome)
    expect(row.kinds).toContain('boat_propeller')
    expect(row.kinds.some((kind: string) => kind.startsWith('fish_'))).toBe(true)
    expect(row.start).toBeCloseTo(0, 4)
    expect(row.panoramaWidth).toBeGreaterThan(1500)
    expect(row.endRight).toBeCloseTo(960, 4)
    expect(row.reducedFrozen).toBe(true)
    expect(row.particlesBounded).toBe(true)
    expect(row.playerDrifts).toBe(true)
    expect(row.wholeHullRetained).toBe(true)
    expect(row.rotorAligned).toBe(true)
    expect(row.released).toBe(true)
    const byDepth = [-8, -6, -4].map(
      (depth) => row.shifts.find((s: { depth: number }) => s.depth === depth)!.shift,
    )
    expect(byDepth[0]).toBeGreaterThan(0)
    expect(byDepth[1]).toBeGreaterThan(byDepth[0])
    expect(byDepth[2]).toBeGreaterThan(byDepth[1])
  }
})

test('SR-14: tropical play keeps advancing after the first rocks enter the viewport', async ({
  page,
}) => {
  test.setTimeout(60000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await config(page)
  await page.goto(url)
  await page.locator('[data-biome="tropical"]').click()
  await page.locator('#tempo-menu').selectOption('1')
  await page.locator('#start').click()
  await page.waitForFunction(() => (window.SealRun?.state?.d ?? 0) > 7000, undefined, {
    timeout: 45000,
  })
  await page.locator('#pause-button').click()
  await expect(page.locator('#resume')).toBeVisible()
  expect(errors).toEqual([])
})

test('SR-14: returning from a hidden menu restores the canvas on every course', async ({
  page,
}) => {
  test.setTimeout(90000)
  await config(page)
  await page.goto(url)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const biome of ['antarctic', 'arctic', 'tropical', 'atlantis', 'coastal', 'antarctic']) {
    await page.locator('[data-biome="' + biome + '"]').click()
    await page.locator('#start').click()
    await expect(page.locator('#stage canvas')).toBeVisible()
    await expect
      .poll(async () => (await page.locator('#stage canvas').boundingBox())?.width ?? 0)
      .toBeGreaterThan(300)
    await page.waitForFunction(() => (window.SealRun?.state?.d ?? 0) > 60)
    await page.keyboard.press('Escape')
    await page.locator('#end-swim').click()
    await page.locator('#back-map').click()
    // Wait for Phaser's parent-size polling to observe the hidden stage. This
    // is the prerequisite for the reported 0x0 canvas on the following start.
    await page.waitForFunction(
      () => (document.querySelector('#stage canvas') as HTMLCanvasElement)?.style.width === '0px',
    )
  }
  expect(errors).toEqual([])
})

test('SR-11: missing predator artwork shows a retryable load failure', async ({ page }) => {
  await config(page)
  await page.route('**/assets/leopard-seal-atlas-v6.webp', (route) => route.abort())
  await page.goto(url)
  await page.locator('[data-biome="antarctic"]').click()
  await page.locator('#start').click()
  await expect(page.locator('#menu')).toBeVisible()
  await expect(page.locator('#start')).toBeEnabled()
  await expect(page.locator('#start-error')).toBeVisible()
  expect(await page.evaluate(() => window.SealRun?.view)).toBe('menu')
  await page.unroute('**/assets/leopard-seal-atlas-v6.webp')
  await page.locator('#start').click()
  await expect(page.locator('#stage canvas')).toBeVisible()
})

test('SR-21: chapter replacement has a stable texture budget and shared leopard frames', async ({
  page,
}) => {
  await config(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(url)
  const report = await page.evaluate(async () => {
    const root = '/games/seal-run-v1/'
    const Phaser = (await import(root + 'vendor/phaser.esm.js')).default
    const { createPlayScene } = await import(root + 'render/scene.js')
    const { createSim } = await import(root + 'core/sim.js')
    const { generateCourse } = await import(root + 'core/course.js')
    const { loadScenery } = await import(root + 'render/scenery.js')
    const { loadHazardArt } = await import(root + 'render/hazards.js')
    document.body.replaceChildren()
    const host = document.createElement('div')
    document.body.append(host)
    const rows = []
    const game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: host,
      width: 960,
      height: 540,
      audio: { noAudio: true },
      scene: [],
    })
    await new Promise((resolve) => game.events.once('ready', resolve))
    for (const biome of ['coastal', 'atlantis', 'tropical', 'arctic', 'antarctic', 'coastal']) {
      await Promise.all([loadScenery(biome), loadHazardArt(biome)])
      const course = generateCourse('texture-lifetime', biome),
        state = createSim(course)
      const Play = createPlayScene(Phaser, {
        state,
        course,
        currentCtrl() {
          return {}
        },
        updateHud() {},
        onEvents() {},
        onEnd() {},
        isPaused() {
          return false
        },
        isReduced() {
          return false
        },
      })
      if (rows.length) {
        game.scene.stop('play')
        game.scene.remove('play')
      }
      game.scene.add('play', Play, true)
      await new Promise((resolve) => game.events.once('postrender', resolve))
      const keys = Object.keys(game.textures.list)
      const textures = keys.flatMap((key) =>
        game.textures
          .get(key)
          .source.map((s: { width: number; height: number }) => s.width * s.height * 4),
      )
      const play = game.scene.getScene('play')
      let leopardShared = true
      if (biome === 'antarctic') {
        state.predators = [
          { type: 'leopard_seal', atLu: 420, band: 3 },
          { type: 'leopard_seal_big', atLu: 690, band: 3 },
        ]
        play.syncWorld(400)
        const normal = play.bound.get('p0')!.spr,
          big = play.bound.get('p1')!.spr
        leopardShared = normal.texture === big.texture && big.displayWidth > normal.displayWidth
      }
      rows.push({
        biome,
        bytes: textures.reduce((n: number, b: number) => n + b, 0),
        count: keys.length,
        legacy: keys.filter((k) =>
          [
            'seal_0',
            'seal_1',
            'orca',
            'shark_white',
            'shark_big',
            'rock',
            'bg_water',
            'bg_far',
            'bg_mid',
            'foam',
          ].includes(k),
        ),
        procedural: keys.filter((k) => /^seal_\w+_\d+$/.test(k)),
        rocks: keys.filter((k) => k.startsWith('rock_')),
        panorama: play.scenery.panorama.texture.getSourceImage().width,
        leopardShared,
      })
    }
    game.destroy(true)
    return rows
  })
  for (const row of report) {
    expect(row.bytes).toBeLessThan(20 * 1024 * 1024)
    expect(row.legacy).toEqual([])
    expect(row.rocks).toEqual(['rock_' + row.biome])
    expect(row.procedural).toHaveLength(['atlantis', 'antarctic'].includes(row.biome) ? 0 : 8)
    expect(row.panorama).toBe(1620)
    expect(row.leopardShared).toBe(true)
  }
  expect(report.at(-1)!.bytes).toBe(report[0].bytes)
  expect(report.at(-1)!.count).toBe(report[0].count)
})

test('SR-21: offline cache serves a compact panorama when the desktop variant was never loaded', async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: 'allow' })
  try {
    const page = await context.newPage()
    await config(page)
    await page.goto(url)
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/games/seal-run-v1/sw.js')
      await navigator.serviceWorker.ready
    })
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
    await context.setOffline(true)
    const size = await page.evaluate(async () => {
      const response = await fetch('/games/seal-run-v1/assets/antarctic-panorama-v2.webp')
      const image = await createImageBitmap(await response.blob())
      const result = [image.width, image.height]
      image.close()
      return result
    })
    expect(size).toEqual([1620, 540])
  } finally {
    await context.close()
  }
})

test('SR-22: calm defaults, explicit background presets and readable play status', async ({
  page,
}) => {
  await config(page)
  await page.goto(url)
  await expect(page.locator('#background-menu')).toHaveValue('calm')
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('#background-menu')).toHaveValue('minimum')
  await page.locator('#background-menu').selectOption('rich')
  await page.reload()
  await expect(page.locator('#background-menu')).toHaveValue('rich')
  await page.setViewportSize({ width: 844, height: 390 })
  await page.locator('#start').click()
  await expect(page.locator('#stage canvas')).toBeVisible()
  const canvas = (await page.locator('#stage canvas').boundingBox())!
  expect(canvas.width).toBeGreaterThan(440)
  const status = (await page.locator('#toast').boundingBox())!
  expect(status.y).toBeGreaterThanOrEqual(canvas.y + canvas.height - 1)
  expect(
    await page
      .locator('#hud-energy-value')
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(14)
  await page.keyboard.press('Escape')
  await page.locator('#background-pause').selectOption('calm')
  await page.locator('#resume').click()
  await expect(page.locator('#stage canvas')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('seal_run_background'))).toBe('calm')
})

test('SR-22: calm scenery clears the target corridor and preset/boost transitions stay continuous', async ({
  page,
}) => {
  await config(page)
  await page.goto(url)
  const report = await page.evaluate(async () => {
    const root = '/games/seal-run-v1/'
    const Phaser = (await import(root + 'vendor/phaser.esm.js')).default
    const { createScenery, loadScenery } = await import(root + 'render/scenery.js')
    const { generateCourse } = await import(root + 'core/course.js')
    const host = document.createElement('div')
    document.body.replaceChildren(host)
    const rows = []
    for (const biome of ['coastal', 'atlantis', 'tropical', 'arctic', 'antarctic']) {
      await loadScenery(biome)
      const game = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: host,
        width: 960,
        height: 540,
        audio: { noAudio: true },
        scene: { create() {} },
      })
      await new Promise<void>((resolve) => game.events.once('postrender', resolve))
      game.loop.stop()
      const scenery = createScenery(game.scene.scenes[0], generateCourse('comfort-review', biome))
      let maxVisible = 0,
        middle = 0
      scenery.update(0, 0, 'calm')
      for (let distance = 300; distance <= 36000; distance += 300) {
        scenery.update(distance, distance / 0.3, 'calm')
        const visible = scenery.props.filter(
          (p: {
            sprite: {
              visible: boolean
              getBounds: () => { left: number; right: number; top: number; bottom: number }
            }
          }) => {
            const b = p.sprite.getBounds()
            return p.sprite.visible && b.right > 0 && b.left < 960 && b.bottom > 0 && b.top < 540
          },
        )
        maxVisible = Math.max(maxVisible, visible.length)
        middle += visible.filter(
          (p: { sprite: { getBounds: () => { top: number; bottom: number } } }) => {
            const b = p.sprite.getBounds()
            return b.top < 340 && b.bottom > 200
          },
        ).length
      }
      const noEffects = !scenery.shimmer.visible && !scenery.motes.visible
      // Method shorthand stays self-contained when CI's tsx loader serializes evaluate().
      const snapshot = {
        positions() {
          return [
            scenery.panorama.x,
            ...scenery.props.map((p: { sprite: { x: number } }) => p.sprite.x),
          ]
        },
      }
      const frozen = snapshot.positions()
      scenery.update(36100, 120100, 'minimum')
      const freezes = JSON.stringify(frozen) === JSON.stringify(snapshot.positions())
      scenery.update(36100, 120100, 'rich')
      const switchContinuous = JSON.stringify(frozen) === JSON.stringify(snapshot.positions())
      // Once moving steadily, a 35% speed boost must not hit decor as a one-frame step.
      let d = 36100,
        t = 120100
      for (let i = 0; i < 180; i++) {
        d += 5
        t += 1000 / 60
        scenery.update(d, t, 'rich')
      }
      const prop = scenery.props[0]
      let before = prop.sprite.x
      d += 5
      t += 1000 / 60
      scenery.update(d, t, 'rich')
      const normal = before - prop.sprite.x
      before = prop.sprite.x
      d += 6.75
      t += 1000 / 60
      scenery.update(d, t, 'rich')
      const boosted = before - prop.sprite.x
      rows.push({
        biome,
        maxVisible,
        middle,
        noEffects,
        freezes,
        switchContinuous,
        ratio: boosted / normal,
      })
      game.destroy(true)
      game.runDestroy()
    }
    return rows
  })
  for (const row of report) {
    expect(row.maxVisible, row.biome).toBeLessThanOrEqual(5)
    expect(row.middle, row.biome).toBe(0)
    expect(row.noEffects && row.freezes && row.switchContinuous, row.biome).toBe(true)
    expect(row.ratio).toBeGreaterThan(1)
    expect(row.ratio).toBeLessThan(1.03)
  }
})

test('SR-23: slow clocks preserve simulation state and steady practice holds current speed through boosts', async ({
  page,
}) => {
  await config(page)
  await page.goto(url)
  await expect(page.locator('#tempo-menu')).toHaveValue('steady')
  const report = await page.evaluate(async () => {
    const root = '/games/seal-run-v1/'
    const Phaser = (await import(root + 'vendor/phaser.esm.js')).default
    const { createSim, applyInput, step } = await import(root + 'core/sim.js')
    const { createPlayScene } = await import(root + 'render/scene.js')
    const { loadScenery } = await import(root + 'render/scenery.js')
    const { loadHazardArt } = await import(root + 'render/hazards.js')
    await Promise.all([loadScenery('coastal'), loadHazardArt('coastal')])
    const host = document.createElement('div')
    document.body.replaceChildren(host)
    const rows = []
    for (const tempo of ['1', '0.5', '0.35', 'steady']) {
      const course = { biome: 'coastal', lengthLu: 36000, seed: 'clock', fish: [], obstacles: [] }
      const state = createSim(course)
      if (tempo === 'steady') {
        state.d = state.worldD = 12000
        state.buffLeftMs = 1000
      }
      let burst = false
      const Play = createPlayScene(Phaser, {
        state,
        course,
        currentCtrl() {
          return { keyDir: 1, burst }
        },
        updateHud() {},
        onEvents() {},
        onEnd() {},
        isPaused() {
          return false
        },
        isReduced() {
          return true
        },
        tempo() {
          return tempo
        },
      })
      const game = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: host,
        width: 960,
        height: 540,
        audio: { noAudio: true },
        scene: [Play],
      })
      while (!game.scene.getScene('play')?.scenery)
        await new Promise<void>((r) => requestAnimationFrame(() => r()))
      game.loop.stop()
      const play = game.scene.getScene('play')
      // Fresh clock, before any automatic frame advanced the fixture.
      Object.assign(state, createSim(course))
      play.acc = 0
      play.pendingBurst = false
      if (tempo === 'steady') {
        state.d = state.worldD = 12000
        state.buffLeftMs = 1000
      }
      play.prev = { d: state.d, worldD: state.worldD, y: state.y }
      const initialD = state.worldD
      for (let frame = 0; frame < 600; frame++) {
        burst = tempo === 'steady' && frame === 240
        play.update(0, 1000 / 60)
      }
      const reference = createSim(course)
      const ticks = Math.round(state.tMs / (1000 / 120))
      if (tempo !== 'steady')
        for (let tick = 0; tick < ticks; tick++) {
          applyInput(reference, { keyDir: 1 })
          step(reference)
        }
      rows.push({
        tempo,
        simMs: state.tMs,
        travel: state.worldD - initialD,
        renderTravel:
          play.prev.worldD -
          initialD +
          (play.acc / (1000 / 120)) * (state.worldD - play.prev.worldD),
        stamina: state.stamina,
        referenceStamina: reference.stamina,
        y: state.y,
        referenceY: reference.y,
        worldD: state.worldD,
        referenceD: reference.worldD,
        burstUsed: state.burstReadyMs > 0,
      })
      game.destroy(true)
      game.runDestroy()
    }
    return rows
  })
  for (const row of report) {
    if (row.tempo === 'steady') {
      expect(row.travel).toBeGreaterThan(1193)
      expect(row.travel).toBeLessThanOrEqual(1201)
      expect(row.burstUsed).toBe(true)
    } else {
      expect(Math.abs(row.simMs - 10000 * Number(row.tempo))).toBeLessThanOrEqual(
        1000 / 120 + 0.001,
      )
      expect(row.stamina).toBeCloseTo(row.referenceStamina, 6)
      expect(row.y).toBeCloseTo(row.referenceY, 6)
      expect(row.worldD).toBeCloseTo(row.referenceD, 6)
    }
  }
})
