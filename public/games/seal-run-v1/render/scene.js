// SR-05/SR-16: renderer is a projection of the fixed-step simulation.
import { applyInput, step, takeEvents, predatorPos } from '../core/sim.js'
import { SIM_DT, FIELD_W, SEAL_X } from '../core/balance.js'
import { WATERLINE_Y } from '../core/theme.js'
import { actorSize, faunaId } from '../core/fauna.js'
import { buildExpeditionTextures } from './expedition.js'
import { fishBob } from './motion.js'
import { createScenery } from './scenery.js'
import { buildHazardTextures, hazardFrame, hazardTexture, ROTOR_SIZE } from './hazards.js'
const STEP_MS = SIM_DT * 1000

export function createPlayScene(Phaser, hooks) {
  const { state, course, currentCtrl, updateHud, onEvents, onEnd, isPaused, isReduced } = hooks
  const texSize = (kind) => actorSize(kind, course.biome)
  const heroSize = texSize('seal')
  const generatedHero = faunaId('seal', course.biome)
  const heroKey = (time) =>
    generatedHero
      ? hazardTexture('seal', course.biome)
      : 'seal_' + course.biome + '_' + (isReduced() ? 0 : Math.floor(time / 80) % 8)
  return class PlayScene extends Phaser.Scene {
    constructor() {
      super('play')
    }

    create() {
      buildExpeditionTextures(this, course.biome)
      buildHazardTextures(this, course.biome)
      this.exitMs = 0
      this.completed = false
      // Пул спрайтов на тип + карта «сущность → спрайт» (object pooling, Roadmap SR-05)
      this.pools = new Map()
      this.bound = new Map()
      this.acc = 0
      this.prev = { y: state.y, d: state.d, worldD: state.worldD }
      this.sealFrame = 0
      this.seal = this.add
        .image(
          SEAL_X,
          state.y,
          heroKey(0),
          generatedHero ? hazardFrame('seal', course.biome, 0) : undefined,
        )
        .setDepth(10)
      this.seal.setOrigin(heroSize.originX ?? 0.5, heroSize.originY)
      this.seal.setDisplaySize(heroSize.w, heroSize.h)

      this.scenery = createScenery(this, course)
      this.scenery.update(0, 0, isReduced())
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
        spr = this.add
          .image(
            0,
            0,
            hazardTexture(kind, course.biome),
            kind === 'boat_propeller'
              ? undefined
              : hazardFrame(kind, course.biome, state.tMs, isReduced()),
          )
          .setDepth(kind === 'skerry_cap' ? 7 : 5)
        const t = texSize(kind) // Biome rocks use dimensions supplied by place().
        if (t && t.originY) spr.setOrigin(t.originX ?? 0.5, t.originY) // центр ТЕЛА = сим-координата
      }
      if (kind === 'boat_propeller' && !spr.rotor) {
        spr.rotor = this.add
          .image(
            0,
            0,
            'rotor_' + course.biome,
            hazardFrame(kind, course.biome, state.tMs, isReduced()),
          )
          .setDepth(5.01)
          .setDisplaySize(ROTOR_SIZE, ROTOR_SIZE)
      }
      spr.setVisible(true)
      spr.rotor?.setVisible(true)
      return spr
    }
    release(kind, spr) {
      spr.setVisible(false)
      spr.rotor?.setVisible(false)
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
        const frame = hazardFrame(kind, course.biome, state.tMs, isReduced())
        if (rec.spr.rotor) {
          rec.spr.rotor.setFrame(frame).setPosition(sx(x), y)
        } else if (rec.spr.frame.name !== frame) {
          rec.spr.setFrame(frame)
          rec.spr.setDisplaySize(dsz.w, dsz.h)
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
        const p = predatorPos(o, renderD)
        const size = texSize(o.type)
        if (
          p.x + size.w * (1 - (size.originX ?? 0.5)) < left ||
          p.x - size.w * (size.originX ?? 0.5) > right
        )
          continue
        place('p' + i, o.type, p.x, p.y, texSize(o.type))
      }
      for (const [key, rec] of this.bound) {
        if (seen.has(key)) continue
        this.release(rec.kind, rec.spr)
        this.bound.delete(key)
      }
    }

    update(_t, deltaMs) {
      this.scenery.setPaused(isPaused() || state.phase !== 'running', isReduced())
      if (this.completed) return
      if (isPaused()) {
        this.acc = 0
        this.prev = { y: state.y, d: state.d, worldD: state.worldD }
        return
      }
      if (state.phase !== 'running') {
        this.exitMs += Math.min(deltaMs, 50)
        const duration = state.phase === 'finished' && !isReduced() ? 950 : 180
        if (state.phase === 'finished') {
          const fromX = SEAL_X + state.d - state.worldD
          this.seal.x = fromX + (FIELD_W + 100 - fromX) * Math.min(1, this.exitMs / duration)
        }
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
        this.prev.worldD = state.worldD
        applyInput(state, currentCtrl())
        step(state)
        this.acc -= STEP_MS
      }
      onEvents(takeEvents(state))
      const a = this.acc / STEP_MS
      const y = this.prev.y + (state.y - this.prev.y) * a
      const d = this.prev.d + (state.d - this.prev.d) * a
      const worldD = this.prev.worldD + (state.worldD - this.prev.worldD) * a
      this.seal.setPosition(SEAL_X + d - worldD, y)
      this.seal.setAlpha(state.tMs < state.invulnUntilMs ? 0.55 : 1)
      // Phaser 4 WebGL can split moving, rotating quads (#7341).
      // Keep the quad axis-aligned; articulated flipper frames carry the swim motion.
      const key = heroKey(state.tMs)
      const frame = generatedHero
        ? hazardFrame('seal', course.biome, state.tMs, isReduced())
        : '__BASE'
      if (this.seal.texture.key !== key || this.seal.frame.name !== frame) {
        this.seal.setTexture(key, frame)
        this.seal.setDisplaySize(heroSize.w, heroSize.h)
      }
      this.scenery.update(worldD, state.tMs, isReduced())
      this.syncWorld(worldD)
      updateHud(state)
    }
  }
}
