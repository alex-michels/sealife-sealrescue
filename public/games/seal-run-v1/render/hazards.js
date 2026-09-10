import { faunaId, faunaFile } from '../core/fauna.js'
// SR-05/06/19: generated parts, registered swim cycles and precomposed rotors.
// Phaser quads stay axis-aligned (moving + rotating quads can corrupt in Phaser 4).
const images = new Map()
const pending = new Map()
const GEAR = {
  coastal: [218, 665, 0.41],
  atlantis: [170, 650, 0.48],
  tropical: [133, 650, 0.48],
  arctic: [280, 695, 0.41],
  antarctic: [219, 716, 0.37],
}
async function load(file) {
  if (images.has(file)) return images.get(file)
  if (pending.has(file)) return pending.get(file)
  const request = new Promise((resolve, reject) => {
    const img = new Image()
    const timer = setTimeout(() => fail(), 8000)
    const fail = () => {
      clearTimeout(timer)
      img.onload = img.onerror = null
      reject(new Error('Hazard artwork unavailable: ' + file))
    }
    img.onerror = fail
    img.onload = () => {
      clearTimeout(timer)
      images.set(file, img)
      resolve(img)
    }
    img.src = new URL('../assets/' + file, import.meta.url).href
  }).finally(() => pending.delete(file))
  pending.set(file, request)
  return request
}
export async function loadHazardArt(biome) {
  const files = ['boat-' + biome + '-v4-hull.webp', 'boat-' + biome + '-v3-propeller.webp']
  const animal = biome === 'arctic' ? 'polar-bear' : biome === 'antarctic' ? 'leopard-seal' : null
  if (animal) for (let i = 0; i < 4; i++) files.push(animal + '-v3-' + i + '.webp')
  for (const kind of ['orca', 'shark_white', 'shark_big', 'seal']) {
    const id = faunaId(kind, biome)
    if (id) for (let i = 0; i < 4; i++) files.push(faunaFile(id, i))
  }
  await Promise.all(files.map(load))
}
export function hazardFrame(kind, biome, time, reduced = false) {
  if (kind === 'boat_propeller')
    return 'boat_' + biome + '_' + (reduced ? 0 : Math.floor(time / 50) % 8)
  if (kind === 'polar_bear' || kind.startsWith('leopard_seal'))
    return kind + '_' + (reduced ? 0 : Math.floor(time / 180) % 4)
  const id = faunaId(kind, biome)
  if (id) return id + '_' + (reduced ? 0 : Math.floor(time / 160) % 4)
  return kind
}
export function buildHazardTextures(scene, biome) {
  const owned = []
  const add = (key, canvas) => {
    if (scene.textures.exists(key)) return
    scene.textures.addCanvas(key, canvas)
    owned.push(key)
  }
  const body = images.get('boat-' + biome + '-v4-hull.webp')
  const rotor = images.get('boat-' + biome + '-v3-propeller.webp')
  if (!body || !rotor) throw new Error('Call loadHazardArt before starting a scene')
  const [gx, gy, scale] = GEAR[biome]
  for (let i = 0; i < 8; i++) {
    const c = document.createElement('canvas')
    c.width = 800
    c.height = 220
    const ctx = c.getContext('2d')
    // Full submerged length. Anything above the waterline belongs outside this scene.
    // Source coordinates use the original 1536px hull; delivery image is 1024px.
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 10, 800, 210)
    ctx.clip()
    ctx.drawImage(body, 100 - gx * scale, 162 - gy * scale, 1536 * scale, 1024 * scale)
    ctx.restore()
    // Ring marks the full swept disc, so stationary blades in reduced motion
    // still communicate the exact circular hazard. The shaft is decorative.
    ctx.strokeStyle = '#f5d798'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(100, 162, 36, 0, Math.PI * 2)
    ctx.stroke()
    ctx.save()
    ctx.translate(100, 162)
    ctx.rotate((i * Math.PI) / 12)
    ctx.drawImage(rotor, -44, -44, 88, 88)
    ctx.restore()
    add('boat_' + biome + '_' + i, c)
  }
  const kinds =
    biome === 'arctic'
      ? ['polar_bear']
      : biome === 'antarctic'
        ? ['leopard_seal', 'leopard_seal_big']
        : []
  for (const kind of kinds)
    for (let i = 0; i < 4; i++) {
      const img = images.get(
        (kind === 'polar_bear' ? 'polar-bear' : 'leopard-seal') + '-v3-' + i + '.webp',
      )
      if (!img) throw new Error('Missing swim frame')
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      c.getContext('2d').drawImage(img, 0, 0)
      add(kind + '_' + i, c)
    }
  for (const kind of ['orca', 'shark_white', 'shark_big', 'seal']) {
    const id = faunaId(kind, biome)
    if (!id) continue
    for (let i = 0; i < 4; i++) {
      const img = images.get(faunaFile(id, i))
      if (!img) throw new Error('Missing fauna frame: ' + id)
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      c.getContext('2d').drawImage(img, 0, 0)
      add(id + '_' + i, c)
    }
  }
  scene.events.once('shutdown', () => {
    for (const key of owned) scene.textures.remove(key)
  })
}

// Menu uses the same registered hero frame; failed artwork remains retryable on Play.
export function loadGeneratedHero(biome) {
  const id = faunaId('seal', biome)
  return id ? load(faunaFile(id)) : Promise.resolve(null)
}
