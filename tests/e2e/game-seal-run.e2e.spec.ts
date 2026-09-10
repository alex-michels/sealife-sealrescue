import { test, expect } from '@playwright/test'
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
        return canvas!.y >= hud!.y + hud!.height && canvas!.y + canvas!.height <= controls!.y
      })
      .toBe(true)
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
        rulesVersion: 'expedition-1',
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
    canvas.width = 180
    canvas.height = 96
    const c = canvas.getContext('2d')!
    return Array.from({ length: 8 }, (_, i) => {
      c.clearRect(0, 0, 180, 96)
      drawPhocid(c, 180, 96, 'spotted', i / 8)
      return {
        tail: c.getImageData(28, 51, 1, 1).data[3],
        above: Math.min(
          ...Array.from(c.getImageData(15, 46, 1, 4).data).filter((_, i) => i % 4 === 3),
        ),
        below: Math.min(
          ...Array.from(c.getImageData(15, 55, 1, 8).data).filter((_, i) => i % 4 === 3),
        ),
      }
    })
  })
  for (const sample of samples) {
    expect(sample.tail).toBeGreaterThanOrEqual(128)
    expect(sample.above).toBeLessThan(128)
    expect(sample.below).toBeLessThan(128)
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

test('SR-06: predator collision circles stay inside visible bodies', async ({ page }) => {
  await page.goto(url)
  const gaps = await page.evaluate(async () => {
    const { buildExpeditionTextures } = await import(
      location.origin + '/games/seal-run-v1/render/expedition.js'
    )
    const { TEXTURES } = await import(location.origin + '/games/seal-run-v1/core/theme.js')
    const { OBSTACLE_DIMS } = await import(location.origin + '/games/seal-run-v1/core/course.js')
    const textures = new Map<string, HTMLCanvasElement>()
    buildExpeditionTextures(
      {
        textures: {
          exists(key: string) {
            return textures.has(key)
          },
          addCanvas(key: string, canvas: HTMLCanvasElement) {
            textures.set(key, canvas)
          },
        },
      },
      'antarctic',
    )
    const missing: string[] = []
    const canvas = document.createElement('canvas')
    const c = canvas.getContext('2d')!
    for (const kind of [
      'orca',
      'shark_white',
      'shark_big',
      'polar_bear',
      'leopard_seal',
      'leopard_seal_big',
    ]) {
      const { w, h, originY = 0.5 } = TEXTURES[kind]
      const r = OBSTACLE_DIMS[kind].r
      canvas.width = w
      canvas.height = h
      c.drawImage(textures.get(kind)!, 0, 0, w, h)
      for (let i = 0; i < 32; i++) {
        const a = (i * Math.PI * 2) / 32
        if (
          c.getImageData(
            Math.round(w / 2 + r * Math.cos(a)),
            Math.round(h * originY + r * Math.sin(a)),
            1,
            1,
          ).data[3] < 128
        )
          missing.push(kind + ':' + i)
      }
    }
    return missing
  })
  expect(gaps).toEqual([])
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
    const host = document.createElement('div')
    document.body.replaceChildren(host)
    const results = []
    for (const biome of ['coastal', 'atlantis', 'tropical', 'arctic', 'antarctic']) {
      await loadScenery(biome)
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
      scenery.update(0, 0, false)
      const start = scenery.panorama.x
      const moving = scenery.props.filter((prop: { base: number }) => prop.base > 1000)
      const before = moving.map((prop: { sprite: { x: number } }) => prop.sprite.x)
      scenery.update(100, 1000, false)
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
      scenery.setPaused(true, true)
      scenery.update(200, 2000, true)
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
        play.syncWorld(distance)
        scenery.update(distance, distance * 3, false)
        for (const rec of play.bound.values()) kinds.add(rec.kind)
      }
      scenery.update(course.lengthLu, 120000, false)
      results.push({
        biome,
        kinds: [...kinds],
        start,
        shifts,
        reducedFrozen,
        released: false,
        endRight: scenery.panorama.x + scenery.panorama.displayWidth,
        panoramaWidth: scenery.panorama.displayWidth,
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
    expect(row.kinds.some((kind: string) => kind.startsWith('fish_'))).toBe(true)
    expect(row.start).toBeCloseTo(0, 4)
    expect(row.panoramaWidth).toBeGreaterThan(1500)
    expect(row.endRight).toBeCloseTo(960, 4)
    expect(row.reducedFrozen).toBe(true)
    expect(row.particlesBounded).toBe(true)
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
  await page.locator('#start').click()
  await page.waitForFunction(() => (window.SealRun?.state?.d ?? 0) > 7000, undefined, {
    timeout: 45000,
  })
  await page.locator('#pause-button').click()
  await expect(page.locator('#resume')).toBeVisible()
  expect(errors).toEqual([])
})
