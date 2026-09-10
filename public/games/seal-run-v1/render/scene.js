// SR-05/SR-16: renderer is a projection of the fixed-step simulation.
import { applyInput, step, takeEvents, predatorPos } from '../core/sim.js'
import { SIM_DT, FIELD_W, WORLD_H, SEAL_X } from '../core/balance.js'
import { TEXTURES, WATERLINE_Y } from '../core/theme.js'
import { buildExpeditionTextures } from './expedition.js'
import { fishBob } from './motion.js'
const STEP_MS = SIM_DT * 1000
const EXTRA = {
  polar_bear: { w: 118, h: 86 },
  leopard_seal: { w: 118, h: 78 },
  leopard_seal_big: { w: 150, h: 102 },
}
const texSize = (kind) => TEXTURES[kind] || EXTRA[kind]
function addScrollLayer(scene, key, factor, depth) {
  const w = 1200
  const a = scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(w, WORLD_H).setDepth(depth)
  const b = scene.add.image(w, 0, key).setOrigin(0, 0).setDisplaySize(w, WORLD_H).setDepth(depth)
  return {
    scroll(d) {
      const x = -((d * factor) % w)
      a.x = x
      b.x = x + w
    },
  }
}
export function createPlayScene(Phaser, hooks) {
  const { state, course, currentCtrl, updateHud, onEvents, onEnd, isPaused, isReduced } = hooks
  return class PlayScene extends Phaser.Scene {
    constructor() {
      super('play')
    }

    create() {
      buildExpeditionTextures(this, course.biome)
      this.exitMs = 0
      this.completed = false
      // Пул спрайтов на тип + карта «сущность → спрайт» (object pooling, Roadmap SR-05)
      this.pools = new Map()
      this.bound = new Map()
      this.acc = 0
      this.prev = { y: state.y, d: state.d }
      this.sealFrame = 0
      this.seal = this.add.image(SEAL_X, state.y, 'seal_' + course.biome + '_0').setDepth(10)
      this.seal.setOrigin(0.5, TEXTURES.seal.originY)
      this.seal.setDisplaySize(TEXTURES.seal.w, TEXTURES.seal.h)

      // Многослойный фон (SR-06): статичная толща воды → дальний/средний параллакс →
      // геймплей (спрайты, depth 5..10) → пена ватерлинии. При prefers-reduced-motion
      // параллакс глушится (factor 0); пена — НЕ параллакс (поверхность живёт в плане
      // геймплея, камни band 0 её пробивают), она скроллится со скоростью мира всегда.
      this.add
        .image(0, 0, 'ocean_' + course.biome + '_water')
        .setOrigin(0, 0)
        .setDisplaySize(FIELD_W, WORLD_H)
        .setDepth(-10)
      this.layers = ['far', 'mid'].map((layer, i) =>
        addScrollLayer(this, 'ocean_' + course.biome + '_' + layer, [0.12, 0.35][i], -8 + i),
      )
    }

    acquire(kind) {
      let pool = this.pools.get(kind)
      if (!pool) {
        pool = []
        this.pools.set(kind, pool)
      }
      let spr = pool.pop()
      if (!spr) {
        // Декор-оверлеи (макушки кекуров) — НАД пеной (7 > 6), геймплей-спрайты — под ней.
        spr = this.add.image(0, 0, kind).setDepth(kind === 'skerry_cap' ? 7 : 5)
        const t = TEXTURES[kind] || EXTRA[kind]
        if (t && t.originY) spr.setOrigin(0.5, t.originY) // центр ТЕЛА = сим-координата
      }
      spr.setVisible(true)
      return spr
    }
    release(kind, spr) {
      spr.setVisible(false)
      this.pools.get(kind).push(spr)
    }

    /** Спрайты видимого окна позиционируются ИЗ sim-состояния. */
    syncWorld(renderD) {
      const left = renderD - SEAL_X - 120
      const right = renderD + (FIELD_W - SEAL_X) + 120
      const sx = (worldX) => SEAL_X + (worldX - renderD)
      const seen = new Set()
      const place = (key, kind, x, y, dsz, flipX = false) => {
        seen.add(key)
        let rec = this.bound.get(key)
        if (!rec) {
          rec = { kind, spr: this.acquire(kind) }
          rec.spr.setDisplaySize(dsz.w, dsz.h)
          rec.spr.setFlipX(flipX)
          this.bound.set(key, rec)
        }
        rec.spr.setPosition(sx(x), y)
      }

      for (let i = 0; i < state.rocks.length; i++) {
        const r = state.rocks[i]
        if (r.x + r.halfW < left) continue
        if (r.x - r.halfW > right) break
        // flipX через один — бесплатная вариативность одной текстуры
        place(
          'r' + i,
          'rock_' + course.biome,
          r.x,
          (r.yTop + r.yBot) / 2,
          { w: r.halfW * 2, h: r.yBot - r.yTop },
          i % 2 === 1,
        )
        if (r.yTop < WATERLINE_Y - 4) {
          // «Квази-суша»: кекур пробивает линию воды — сухая макушка + пенная юбка
          const capH = Math.min(26, WATERLINE_Y - r.yTop + 10)
          place('rc' + i, 'skerry_cap', r.x, WATERLINE_Y + 8 - capH / 2, {
            w: r.halfW * 2 * 0.98,
            h: capH,
          })
        }
      }
      for (let i = 0; i < state.debris.length; i++) {
        const z = state.debris[i]
        if (z.x + z.halfW < left) continue
        if (z.x - z.halfW > right) break
        const kind = z.halfH > 70 ? 'ghost_net' : 'plastic_cluster'
        place('z' + i, kind, z.x, z.yc, texSize(kind))
      }
      for (let i = 0; i < state.fish.length; i++) {
        const f = state.fish[i]
        if (f.x < left) continue
        if (f.x > right) break
        if (f.taken) continue
        place('f' + i, f.type, f.x, f.y + fishBob(f, state.tMs, isReduced()), texSize(f.type))
      }
      for (let i = 0; i < state.predators.length; i++) {
        const o = state.predators[i]
        if (o.atLu < renderD - 2 * FIELD_W) continue
        if (o.atLu > right) break
        const p = predatorPos(o, state.d)
        if (p.x < left || p.x > right) continue
        place('p' + i, o.type, p.x, p.y, texSize(o.type))
      }
      for (const [key, rec] of this.bound) {
        if (seen.has(key)) continue
        this.release(rec.kind, rec.spr)
        this.bound.delete(key)
      }
    }

    update(_t, deltaMs) {
      if (this.completed) return
      if (isPaused()) {
        this.acc = 0
        this.prev = { y: state.y, d: state.d }
        return
      }
      if (state.phase !== 'running') {
        this.exitMs += Math.min(deltaMs, 50)
        const duration = state.phase === 'finished' && !isReduced() ? 950 : 180
        if (state.phase === 'finished')
          this.seal.x = SEAL_X + (FIELD_W + 100 - SEAL_X) * Math.min(1, this.exitMs / duration)
        if (this.exitMs >= duration) {
          this.completed = true
          onEnd(state)
        }
        return
      }
      // Аккумулятор фикс-шага (спека §1.3); кламп дельты — после возврата вкладки
      // не наматываем «догоняющие» секунды.
      this.acc += Math.min(deltaMs, 100)
      while (this.acc >= STEP_MS && state.phase === 'running') {
        this.prev.y = state.y
        this.prev.d = state.d
        applyInput(state, currentCtrl())
        step(state)
        this.acc -= STEP_MS
      }
      onEvents(takeEvents(state))
      const a = this.acc / STEP_MS
      const y = this.prev.y + (state.y - this.prev.y) * a
      const d = this.prev.d + (state.d - this.prev.d) * a
      this.seal.setPosition(SEAL_X, y)
      this.seal.setAlpha(state.tMs < state.invulnUntilMs ? 0.55 : 1)
      this.seal.setRotation(isReduced() ? 0 : Math.atan2(state.vy, 300) * 0.28)
      const frame = isReduced() ? 0 : Math.floor(state.tMs / 80) % 8
      if (frame !== this.sealFrame) {
        this.sealFrame = frame
        this.seal.setTexture('seal_' + course.biome + '_' + frame)
        this.seal.setDisplaySize(TEXTURES.seal.w, TEXTURES.seal.h)
      }
      for (const layer of this.layers) layer.scroll(isReduced() ? 0 : d)
      this.syncWorld(d)
      updateHud(state)
    }
  }
}
