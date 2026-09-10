// SR-21: compare actual scene lifetimes, render submission and local asset loading.
// node .../profile-art.mjs <baseline-public-dir> [report.json]
import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const current = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)))
const roots = process.argv[2]
  ? [
      ['before', path.resolve(process.argv[2])],
      ['after', current],
    ]
  : [['after', current]]
const output = process.argv[3] ?? 'docs/seal-run-image-performance-results.json'
const browser = await chromium.launch({ headless: true })
const results = []
try {
  for (const [version, root] of roots) {
    const server = http.createServer(async (req, res) => {
      const pathname = new URL(req.url, 'http://localhost').pathname
      if (pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(
          '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#102b3a"><div id="stage" style="width:100vw;height:100vh"></div>',
        )
        return
      }
      const file = path.resolve(root, '.' + pathname)
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403)
        res.end()
        return
      }
      try {
        const body = await readFile(file)
        res.writeHead(200, {
          'Content-Type': file.endsWith('.js') ? 'text/javascript' : 'image/webp',
          'Content-Length': body.length,
          'Cache-Control': 'no-store',
        })
        res.end(body)
      } catch {
        res.writeHead(404)
        res.end()
      }
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      for (const [profile, width, height] of [
        ['desktop', 1280, 800],
        ['mobile-viewport', 390, 844],
      ]) {
        const context = await browser.newContext({ viewport: { width, height } })
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.goto('http://127.0.0.1:' + server.address().port)
        const chapters = await page.evaluate(async () => {
          const root = '/games/seal-run-v1/'
          const Phaser = (await import(root + 'vendor/phaser.esm.js')).default
          const { createPlayScene } = await import(root + 'render/scene.js')
          const { createSim } = await import(root + 'core/sim.js')
          const { generateCourse } = await import(root + 'core/course.js')
          const { loadScenery } = await import(root + 'render/scenery.js')
          const { loadHazardArt } = await import(root + 'render/hazards.js')
          const out = []
          let game
          let drawCalls = 0
          for (const biome of [
            'coastal',
            'atlantis',
            'tropical',
            'arctic',
            'antarctic',
            'coastal',
          ]) {
            performance.clearResourceTimings()
            const loadStart = performance.now()
            await Promise.all([loadScenery(biome), loadHazardArt(biome)])
            const loadMs = performance.now() - loadStart
            const course = generateCourse('image-profile', biome),
              state = createSim(course)
            // Same populated middle section; prevent deaths from shortening the sample.
            state.d = state.worldD = 4500
            state.invulnUntilMs = 1e9
            const Play = createPlayScene(Phaser, {
              course,
              state,
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
            const createStart = performance.now()
            if (!game) {
              game = new Phaser.Game({
                type: Phaser.WEBGL,
                parent: 'stage',
                width: 960,
                height: 540,
                scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
                audio: { noAudio: true },
                scene: [Play],
              })
            } else {
              game.scene.stop('play')
              game.scene.remove('play')
              game.scene.add('play', Play, true)
            }
            await new Promise((resolve) => game.events.once('postrender', resolve))
            const createMs = performance.now() - createStart
            if (!out.length) {
              const gl = game.renderer.gl
              for (const method of [
                'drawArrays',
                'drawElements',
                'drawArraysInstanced',
                'drawElementsInstanced',
              ]) {
                if (!gl[method]) continue
                const original = gl[method].bind(gl)
                gl[method] = (...args) => {
                  drawCalls++
                  return original(...args)
                }
              }
            }
            const intervals = [],
              submission = [],
              calls = []
            await new Promise((resolve) => {
              let count = 0,
                last = performance.now(),
                start
              const pre = () => {
                start = performance.now()
                drawCalls = 0
              }
              const post = () => {
                const now = performance.now()
                if (count >= 10) {
                  intervals.push(now - last)
                  submission.push(now - start)
                  calls.push(drawCalls)
                }
                last = now
                if (++count === 70) {
                  game.events.off('prerender', pre)
                  game.events.off('postrender', post)
                  resolve()
                }
              }
              game.events.on('prerender', pre)
              game.events.on('postrender', post)
            })
            const stats = (values) => {
              const sorted = [...values].sort((a, b) => a - b)
              return {
                p50: sorted[Math.floor(sorted.length * 0.5)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
              }
            }
            const textures = Object.entries(game.textures.list).flatMap(([key, t]) =>
              t.source.map((s) => ({ key, width: s.width, height: s.height })),
            )
            const resources = performance
              .getEntriesByType('resource')
              .filter((r) => r.name.endsWith('.webp'))
            out.push({
              biome,
              loadMs,
              createMs,
              textureCount: textures.length,
              rgbaBytes: textures.reduce((n, t) => n + t.width * t.height * 4, 0),
              textures,
              imageRequests: resources.length,
              imageBytes: resources.reduce((n, r) => n + r.encodedBodySize, 0),
              frameIntervalMs: stats(intervals),
              renderSubmissionMs: stats(submission),
              drawCalls: stats(calls),
            })
          }
          game.destroy(true)
          return out
        })
        results.push({ version, profile, errors, chapters })
        console.log(
          version,
          profile,
          chapters.map((c) => ({
            biome: c.biome,
            MiB: +(c.rgbaBytes / 1048576).toFixed(2),
            images: c.imageRequests,
            frameP95: +c.frameIntervalMs.p95.toFixed(2),
            calls: c.drawCalls.p95,
          })),
        )
        await context.close()
      }
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  }
} finally {
  await browser.close()
}
await writeFile(
  output,
  JSON.stringify(
    {
      date: '2026-09-10',
      baseline: 'e7d5e252',
      method:
        'Desktop headless Chromium WebGL, 60 frames after 10 warm-up frames per chapter, fixed seed and middle-course position, six chapter replacements. Mobile is viewport emulation, not a physical phone. Local no-store HTTP transfers. RGBA8 base-level estimates exclude copies/driver/render-target overhead; submission is CPU wall time, not GPU execution time.',
      results,
    },
    null,
    2,
  ) + '\n',
)
