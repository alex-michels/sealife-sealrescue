// SR-22: reproducible local 2x2 presentation comparison. Never changes shipped APIs.
// node tools/measure-seal-run-comfort.mjs <baseline-public-directory> [output-directory]
import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
const baseline = path.resolve(
  process.argv[2] ?? 'playwright/.cache/sr-review/comfort-before/public',
)
const output = path.resolve(process.argv[3] ?? 'playwright/.cache/sr-review/comfort-comparison')
await mkdir(output, { recursive: true })
const current = path.resolve('public')
const prefix = '/games/seal-run-v1/'
const browser = await chromium.launch({ headless: true })
const report = {
  date: new Date().toISOString(),
  baselineCommit: 'ee7794b7f2fcf00a0f888610f1f972938063a549',
  seed: 'comfort-review',
  environment:
    'Desktop headless Chromium, emulated CSS viewports; not physical mobile or embedded-browser performance. Timings include real simulation/rendering with health held stable by an isolated test fixture.',
  variants: [],
  layouts: [],
}
try {
  for (const variant of ['baseline', 'background-only', 'ui-only', 'combined']) {
    const page = await browser.newPage({
      viewport: { width: 844, height: 390 },
      serviceWorkers: 'block',
    })
    await page.route('**/api/game-config?*', (r) => r.fulfill({ json: { standalone: true } }))
    await page.route('**/games/seal-run-v1/**', async (r) => {
      const file = new URL(r.request().url()).pathname
      const relative = file.slice(prefix.length) || 'index.html'
      const modernUI = variant === 'combined' || variant === 'ui-only'
      const modernBG = variant === 'combined' || variant === 'background-only'
      const root =
        relative === 'render/scenery.js'
          ? modernBG
            ? current
            : baseline
          : modernUI
            ? current
            : baseline
      let data = await readFile(path.join(root, prefix, relative))
      const ext = path.extname(relative)
      if (ext === '.js') {
        let s = data.toString('utf8')
        if (relative === 'render/scenery.js' && modernUI && !modernBG) {
          s = s.replace(
            'setPaused(paused, reduced) {',
            "setPaused(paused, reduced) { reduced = reduced === 'minimum';",
          )
          s = s.replace(
            'update(distance, timeMs, reduced) {',
            "update(distance, timeMs, reduced) { reduced = reduced === 'minimum';",
          )
        }
        if (relative === 'render/scene.js') {
          if (!modernUI && modernBG) {
            s = s
              .replaceAll(
                'this.scenery.update(0, 0, isReduced())',
                "this.scenery.update(0, 0, 'calm')",
              )
              .replaceAll(
                'this.scenery.update(worldD, state.tMs, isReduced())',
                "this.scenery.update(worldD, state.tMs, 'calm')",
              )
              .replaceAll(
                "this.scenery.setPaused(isPaused() || state.phase !== 'running', isReduced())",
                "this.scenery.setPaused(isPaused() || state.phase !== 'running', 'calm')",
              )
              .replaceAll('fishBob(f, state.tMs, isReduced())', 'fishBob(f, state.tMs, true)')
          }
          s = s.replace('export function createPlayScene(', 'function originalCreatePlayScene(')
          s +=
            '\nexport function createPlayScene(P,h) { const Play=originalCreatePlayScene(P,h); return class extends Play { create(){super.create(); window.__comfort={play:this,hooks:h};} }; }\n'
        }
        data = Buffer.from(s)
      }
      const types = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.webp': 'image/webp',
      }
      await r.fulfill({ body: data, contentType: types[ext] ?? 'application/octet-stream' })
    })
    await page.goto('http://127.0.0.1:4173' + prefix + 'index.html?lang=ru&seed=comfort-review')
    if (await page.locator('#tempo-menu').count())
      await page.locator('#tempo-menu').selectOption('1')
    if (variant === 'ui-only') await page.locator('#background-menu').selectOption('rich')
    await page.locator('#start').click()
    await page.waitForFunction(() => Boolean(window.__comfort))
    const shot = await page.evaluate(
      ({ modernBG }) => {
        const { play, hooks } = window.__comfort
        const state = hooks.state
        play.game.loop.stop()
        state.d = state.worldD = 6000
        state.tMs = 20000
        state.y = 270
        play.prev = { d: 6000, worldD: 6000, y: 270 }
        state.lives = 3
        state.stamina = 100
        play.seal.setPosition(240, 270)
        play.scenery.update(6000, 20000, modernBG ? 'calm' : false)
        play.syncWorld(6000)
        hooks.updateHud(state)
        play.game.step(performance.now(), 0)
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect().toJSON()
        return {
          canvas: rect('#stage canvas'),
          hud: rect('#hud'),
          energyFont: getComputedStyle(document.querySelector('#hud-energy-value')).fontSize,
        }
      },
      { modernBG: variant === 'background-only' || variant === 'combined' },
    )
    await page.screenshot({ path: path.join(output, variant + '.png') })
    const timing = await page.evaluate(async () => {
      const { play, hooks } = window.__comfort
      const times = []
      const start = performance.now()
      let last = start
      await new Promise((resolve) => {
        function frame(now) {
          const delta = now - last
          last = now
          if (now - start > 1500) times.push(delta)
          hooks.state.lives = 3
          hooks.state.stamina = 100
          hooks.state.phase = 'running'
          play.completed = false
          play.game.step(now, delta)
          if (now - start < 12000) requestAnimationFrame(frame)
          else resolve()
        }
        requestAnimationFrame(frame)
      })
      times.sort((a, b) => a - b)
      const gl = play.game.renderer.gl
      const ext = gl?.getExtension('WEBGL_debug_renderer_info')
      return {
        samples: times.length,
        p50: times[Math.floor(times.length * 0.5)],
        p95: times[Math.floor(times.length * 0.95)],
        p99: times[Math.floor(times.length * 0.99)],
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable',
      }
    })
    const clutter = await page.evaluate(
      ({ modernBG }) => {
        const { play } = window.__comfort
        const scenery = play.scenery
        const samples = []
        for (let d = 0; d <= 36000; d += 300) {
          scenery.update(d, d / 0.3, modernBG ? 'calm' : false)
          samples.push(
            scenery.props.filter((p) => {
              const b = p.sprite.getBounds()
              return (
                p.sprite.visible &&
                p.sprite.alpha > 0.01 &&
                b.right > 0 &&
                b.left < 960 &&
                b.bottom > 0 &&
                b.top < 540
              )
            }).length,
          )
        }
        return {
          min: Math.min(...samples),
          max: Math.max(...samples),
          mean: samples.reduce((a, b) => a + b, 0) / samples.length,
        }
      },
      { modernBG: variant === 'background-only' || variant === 'combined' },
    )
    report.variants.push({ variant, ...shot, clutter, timing })
    console.log(variant, JSON.stringify({ canvas: shot.canvas.width, clutter, timing }))
    if (variant === 'combined') {
      for (const size of [
        { width: 390, height: 844 },
        { width: 1239, height: 1271 },
        { width: 1440, height: 900 },
      ]) {
        await page.setViewportSize(size)
        await page.waitForTimeout(200)
        report.layouts.push({
          viewport: size,
          canvas: await page.locator('#stage canvas').boundingBox(),
          hud: await page.locator('#hud').boundingBox(),
        })
        await page.screenshot({ path: path.join(output, `combined-${size.width}.png`) })
      }
    }
    await page.close()
  }
} finally {
  await browser.close()
}
await writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n')
