import { ATLASES } from './atlas-data.js'
import { faunaId } from '../core/fauna.js'
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
function animalIds(biome) {
  return [
    ...new Set(
      [
        biome === 'arctic' ? 'polar_bear' : biome === 'antarctic' ? 'leopard_seal' : null,
        ...['orca', 'shark_white', 'shark_big', 'seal'].map((kind) => faunaId(kind, biome)),
      ].filter(Boolean),
    ),
  ]
}
export async function loadHazardArt(biome) {
  const files = [
    'boat-' + biome + '-v4-hull.webp',
    'boat-' + biome + '-v3-propeller.webp',
    ...animalIds(biome).map((id) => ATLASES[id].file),
  ]
  await Promise.all(files.map(load))
  // Existing scene textures retain their own image references until shutdown.
  // The loader need not retain decoded artwork for every previously visited chapter.
  for (const file of images.keys()) if (!files.includes(file)) images.delete(file)
}
export function hazardTexture(kind, biome) {
  if (kind === 'boat_propeller') return 'boat_' + biome + '_hull'
  if (kind.startsWith('leopard_seal')) return 'leopard_seal'
  return faunaId(kind, biome) ?? kind
}
export function hazardFrame(kind, biome, time, reduced = false) {
  if (kind === 'boat_propeller')
    return 'boat_' + biome + '_' + (reduced ? 0 : Math.floor(time / 50) % 8)
  if (kind === 'polar_bear' || kind.startsWith('leopard_seal'))
    return hazardTexture(kind, biome) + '_' + (reduced ? 0 : Math.floor(time / 180) % 4)
  const id = faunaId(kind, biome)
  if (id) return id + '_' + (reduced ? 0 : Math.floor(time / 160) % 4)
  return '__BASE'
}
export const ROTOR_SIZE = 96
export function buildHazardTextures(scene, biome) {
  const owned = []
  const body = images.get('boat-' + biome + '-v4-hull.webp')
  const rotor = images.get('boat-' + biome + '-v3-propeller.webp')
  if (!body || !rotor) throw new Error('Call loadHazardArt before starting a scene')
  const [gx, gy, scale] = GEAR[biome]
  const hull = document.createElement('canvas')
  hull.width = 800
  hull.height = 220
  const ctx = hull.getContext('2d')
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 10, 800, 210)
  ctx.clip()
  ctx.drawImage(body, 100 - gx * scale, 162 - gy * scale, 1536 * scale, 1024 * scale)
  ctx.restore()
  const hullKey = 'boat_' + biome + '_hull'
  scene.textures.addCanvas(hullKey, hull)
  owned.push(hullKey)

  // One static hull and eight small pre-rotated propellers. No rotating Phaser quad.
  const sheet = document.createElement('canvas')
  sheet.width = ROTOR_SIZE * 4
  sheet.height = ROTOR_SIZE * 2
  const r = sheet.getContext('2d'),
    frames = {}
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * ROTOR_SIZE,
      y = Math.floor(i / 4) * ROTOR_SIZE
    r.save()
    r.translate(x + ROTOR_SIZE / 2, y + ROTOR_SIZE / 2)
    r.strokeStyle = '#f5d798'
    r.lineWidth = 2
    r.beginPath()
    r.arc(0, 0, 36, 0, Math.PI * 2)
    r.stroke()
    r.rotate((i * Math.PI) / 12)
    r.drawImage(rotor, -44, -44, 88, 88)
    r.restore()
    frames['boat_' + biome + '_' + i] = { frame: { x, y, w: ROTOR_SIZE, h: ROTOR_SIZE } }
  }
  const rotorKey = 'rotor_' + biome
  scene.textures.addAtlas(rotorKey, sheet, { frames })
  owned.push(rotorKey)
  for (const id of animalIds(biome)) {
    const data = ATLASES[id],
      img = images.get(data.file)
    if (!img) throw new Error('Missing fauna atlas: ' + id)
    scene.textures.addAtlas(id, img, data)
    owned.push(id)
  }
  scene.events.once('shutdown', () => {
    for (const key of owned) scene.textures.remove(key)
  })
}

// Untrim into the original registered rectangle for the contained HTML cover.
export async function loadGeneratedHero(biome) {
  const id = faunaId('seal', biome)
  if (!id) return null
  const data = ATLASES[id],
    img = await load(data.file)
  const { frame, spriteSourceSize: trim, sourceSize: size } = data.frames[id + '_0']
  const canvas = document.createElement('canvas')
  canvas.width = size.w
  canvas.height = size.h
  canvas
    .getContext('2d')
    .drawImage(img, frame.x, frame.y, frame.w, frame.h, trim.x, trim.y, trim.w, trim.h)
  return canvas
}
