// SR-05/06/19: generated parts, registered swim cycles and precomposed rotors.
// Phaser quads stay axis-aligned (moving + rotating quads can corrupt in Phaser 4).
const images = new Map()
const pending = new Map()
const GEAR = {
  coastal: [776, 607],
  atlantis: [770, 605],
  tropical: [770, 622],
  arctic: [781, 571],
  antarctic: [751, 610],
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
  const files = ['boat-' + biome + '-v3-body.webp', 'boat-' + biome + '-v3-propeller.webp']
  const animal = biome === 'arctic' ? 'polar-bear' : biome === 'antarctic' ? 'leopard-seal' : null
  if (animal) for (let i = 0; i < 4; i++) files.push(animal + '-v3-' + i + '.webp')
  await Promise.all(files.map(load))
}
export function hazardFrame(kind, biome, time, reduced = false) {
  if (kind === 'boat_propeller')
    return 'boat_' + biome + '_' + (reduced ? 0 : Math.floor(time / 50) % 8)
  if (kind === 'polar_bear' || kind.startsWith('leopard_seal'))
    return kind + '_' + (reduced ? 0 : Math.floor(time / 180) % 4)
  return kind
}
export function buildHazardTextures(scene, biome) {
  const owned = []
  const add = (key, canvas) => {
    if (scene.textures.exists(key)) return
    scene.textures.addCanvas(key, canvas)
    owned.push(key)
  }
  const body = images.get('boat-' + biome + '-v3-body.webp')
  const rotor = images.get('boat-' + biome + '-v3-propeller.webp')
  if (!body || !rotor) throw new Error('Call loadHazardArt before starting a scene')
  const [gx, gy] = GEAR[biome]
  for (let i = 0; i < 8; i++) {
    const c = document.createElement('canvas')
    c.width = 800
    c.height = 480
    const ctx = c.getContext('2d')
    ctx.scale(2, 2)
    ctx.drawImage(body, 200 - gx * 0.28, 190 - gy * 0.28, body.width * 0.56, body.height * 0.56)
    // Ring marks the full swept disc, so stationary blades in reduced motion
    // still communicate the exact circular hazard. The shaft is decorative.
    ctx.strokeStyle = '#f5d798'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(200, 190, 36, 0, Math.PI * 2)
    ctx.stroke()
    ctx.save()
    ctx.translate(200, 190)
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
  scene.events.once('shutdown', () => {
    for (const key of owned) scene.textures.remove(key)
  })
}
