// SR-06/19: a distance-driven panorama plus independent Phaser scenery planes.
// These objects never enter simulation/collision state.
import { FIELD_W, WORLD_H } from '../core/balance.js'
import { BIOMES } from '../core/biomes.js'
import { paintOcean } from './expedition.js'

const images = new Map()
const pending = new Map()
const PROP_IDS = ['kelp', 'boulders', 'arch', 'reef', 'sea-ice', 'glacier']
const HABITAT = {
  coastal: ['boulders', 'kelp', 'boulders', 'kelp'],
  atlantis: ['arch', 'boulders', 'arch', 'kelp'],
  tropical: ['reef', 'boulders', 'reef', 'reef'],
  arctic: ['sea-ice', 'boulders', 'sea-ice', 'glacier'],
  antarctic: ['glacier', 'sea-ice', 'glacier', 'boulders'],
}
const PLANES = [
  { factor: 0.16, span: 2530, count: 7, height: 160, alpha: 0.26, depth: -8 },
  { factor: 0.4, span: 2870, count: 8, height: 225, alpha: 0.43, depth: -6 },
  { factor: 0.72, span: 3310, count: 8, height: 280, alpha: 0.58, depth: -4 },
]
function loadImage(file) {
  if (images.has(file)) return Promise.resolve(images.get(file))
  if (pending.has(file)) return pending.get(file)
  const promise = new Promise((resolve) => {
    const image = new Image()
    let done = false
    const finish = (ok) => {
      if (done) return
      done = true
      clearTimeout(timer)
      pending.delete(file)
      if (ok) {
        images.set(file, image)
        // Keep at most two decoded panorama plates; props are shared across chapters.
        const panoramas = [...images.keys()].filter((key) => key.includes('-panorama-'))
        for (const key of panoramas.slice(0, -2)) images.delete(key)
      }
      resolve(ok ? image : null)
    }
    const timer = setTimeout(() => finish(false), 6000)
    image.onload = () => finish(true)
    image.onerror = () => finish(false)
    image.src = new URL('../assets/' + file, import.meta.url).href
  })
  pending.set(file, promise)
  return promise
}
export function loadScenery(biome) {
  return Promise.all([
    loadImage(biome + '-panorama-v2.webp'),
    ...PROP_IDS.map((id) => loadImage('scenery-' + id + '-v2.webp')),
  ])
}
function canvasTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  scene.textures.addCanvas(key, canvas)
}
function fallbackProp(c, w, h, id, colour) {
  c.fillStyle = colour
  c.strokeStyle = colour
  c.lineWidth = 12
  if (id === 'kelp') {
    for (let i = 0; i < 4; i++) {
      c.beginPath()
      c.moveTo(w / 2, h)
      c.bezierCurveTo(i * 25, h * 0.7, w - i * 20, h * 0.4, 20 + i * 24, 10)
      c.stroke()
    }
  } else if (id === 'arch') {
    c.lineWidth = 30
    c.beginPath()
    c.moveTo(24, h)
    c.lineTo(24, h / 2)
    c.arc(w / 2, h / 2, w / 2 - 24, Math.PI, 0)
    c.lineTo(w - 24, h)
    c.stroke()
  } else {
    c.beginPath()
    c.moveTo(0, h)
    c.lineTo(10, h * 0.55)
    c.lineTo(w * 0.4, 10)
    c.lineTo(w * 0.7, h * 0.2)
    c.lineTo(w, h * 0.65)
    c.lineTo(w, h)
    c.fill()
  }
}
export function createScenery(scene, course) {
  const biome = course.biome
  const palette = BIOMES[biome]
  const owned = []
  const panoramaKey = 'panorama_' + biome
  const panoramaImage = images.get(biome + '-panorama-v2.webp')
  if (panoramaImage) scene.textures.addImage(panoramaKey, panoramaImage)
  else
    canvasTexture(scene, panoramaKey, 2400, 600, (c, w, h) => paintOcean(c, w, h, biome, 'water'))
  owned.push(panoramaKey)
  const source = scene.textures.get(panoramaKey).getSourceImage()
  const panoramaWidth = Math.max(FIELD_W, (source.width / source.height) * WORLD_H)
  const panorama = scene.add
    .image(0, 0, panoramaKey)
    .setOrigin(0, 0)
    .setDisplaySize(panoramaWidth, WORLD_H)
    .setDepth(-12)

  for (const id of new Set(HABITAT[biome])) {
    const key = 'scenery_' + id
    if (!scene.textures.exists(key)) {
      const image = images.get('scenery-' + id + '-v2.webp')
      if (image) scene.textures.addImage(key, image)
      else
        canvasTexture(scene, key, 128, 192, (c, w, h) => fallbackProp(c, w, h, id, palette.scenery))
    }
    owned.push(key)
  }
  // A fixed pool recycles only beyond both viewport edges. No repeated full-frame seams.
  let hash = 0
  for (const char of String(course.seed ?? biome))
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0
  const props = []
  for (const [planeIndex, plane] of PLANES.entries()) {
    for (let i = 0; i < plane.count; i++) {
      const id = HABITAT[biome][(i + planeIndex) % HABITAT[biome].length]
      const texture = scene.textures.get('scenery_' + id).getSourceImage()
      const height = plane.height * (0.72 + ((i * 37 + (hash % 41)) % 60) / 100)
      const hanging = id === 'sea-ice'
      const y = hanging ? -height * 0.55 : WORLD_H + height * 0.1
      const base = (i * plane.span) / plane.count + (hash % 170)
      const sprite = scene.add
        .image(base - 450, y, 'scenery_' + id)
        .setOrigin(0.5, hanging ? 0 : 1)
        .setDisplaySize((height * texture.width) / texture.height, height)
        .setDepth(plane.depth)
        .setAlpha(plane.alpha)
        .setTint(Number.parseInt(palette.scenery.slice(1), 16))
        .setFlipX(i % 2 === 1)
      props.push({ sprite, id, plane, height, width: sprite.displayWidth, y, base })
    }
  }
  canvasTexture(scene, 'ocean_shimmer', 512, 256, (c, w) => {
    c.strokeStyle = 'rgba(216,244,246,.3)'
    c.lineWidth = 1.2
    for (let row = 0; row < 7; row++) {
      c.beginPath()
      for (let x = 0; x <= w; x += 4) {
        const y = row * 40 + Math.sin((x * Math.PI * 4) / w + row) * 7
        if (x === 0) c.moveTo(x, y)
        else c.lineTo(x, y)
      }
      c.stroke()
    }
  })
  const shimmer = scene.add
    .tileSprite(0, 0, FIELD_W, WORLD_H, 'ocean_shimmer')
    .setOrigin(0, 0)
    .setDepth(-10)
    .setAlpha(0.12)
    .setBlendMode('ADD')
  canvasTexture(scene, 'ocean_mote', 16, 16, (c) => {
    const glow = c.createRadialGradient(8, 8, 0, 8, 8, 7)
    glow.addColorStop(0, 'rgba(228,248,247,.75)')
    glow.addColorStop(1, 'rgba(228,248,247,0)')
    c.fillStyle = glow
    c.fillRect(0, 0, 16, 16)
  })
  const motes = scene.add
    .particles(0, 0, 'ocean_mote', {
      x: { min: 0, max: FIELD_W },
      y: { min: 20, max: WORLD_H },
      lifespan: { min: 4000, max: 7000 },
      frequency: 180,
      maxParticles: 36,
      speedX: { min: -35, max: -12 },
      speedY: { min: -12, max: -3 },
      scale: { start: 0.28, end: 0.05 },
      alpha: { start: 0.3, end: 0 },
    })
    .setDepth(-3)
  motes.active = false
  scene.events.once('shutdown', () => {
    // Phaser destroys display objects; release chapter-specific GPU images afterwards.
    for (const key of owned) scene.textures.remove(key)
  })
  let lastDistance = null
  return {
    panorama,
    props,
    shimmer,
    motes,
    setPaused(paused, reduced) {
      motes.active = !paused && !reduced
      motes.visible = !reduced
    },
    update(distance, timeMs, reduced) {
      // Reduced motion freezes decor; normal motion projects the current route distance.
      const delta = lastDistance == null ? 0 : Math.max(0, distance - lastDistance)
      lastDistance = distance
      if (reduced) {
        shimmer.visible = false
        return
      }
      shimmer.visible = true
      // Full left edge at launch, exact right edge at the chapter finish.
      panorama.x = -(panoramaWidth - FIELD_W) * Math.min(1, Math.max(0, distance / course.lengthLu))
      shimmer.tilePositionX += delta * 0.09
      shimmer.tilePositionY = Math.sin(timeMs / 5000) * 6
      for (const prop of props) {
        prop.sprite.x =
          ((((prop.base - distance * prop.plane.factor) % prop.plane.span) + prop.plane.span) %
            prop.plane.span) -
          450
        // Scale-only kelp sway avoids Phaser 4's rotating/moving-quad issue.
        if (prop.id === 'kelp')
          prop.sprite.displayWidth = prop.width * (1 + Math.sin(timeMs / 1300 + prop.base) * 0.045)
      }
    },
  }
}
