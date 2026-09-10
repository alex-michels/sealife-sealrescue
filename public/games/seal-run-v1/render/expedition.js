import { loadGeneratedHero } from './hazards.js'
const heroPreviews = new WeakMap()
// SR-06/SR-19. Original articulated Canvas animals over generated environment plates.
import { faunaId } from '../core/fauna.js'
import { BIOMES } from '../core/biomes.js'
import { buildTextures } from './art.js'

const ellipse = (c, x, y, rx, ry, colour, angle = 0) => {
  c.fillStyle = colour
  c.beginPath()
  c.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2)
  c.fill()
}
const polygon = (c, points, colour) => {
  c.fillStyle = colour
  c.beginPath()
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.closePath()
  c.fill()
}

// SR-06: a phocid, with two webbed hindflippers and a separate short tail.
export function drawPhocid(c, w, h, coat = 'spotted', phase = 0) {
  c.save()
  c.scale(w / 180, h / 96)
  c.lineJoin = 'round'
  c.lineCap = 'round'
  const beat = Math.sin(phase * Math.PI * 2)
  const body = c.createLinearGradient(0, 16, 0, 79)
  body.addColorStop(0, coat === 'weddell' ? '#405766' : '#657e88')
  body.addColorStop(0.35, coat === 'monk' ? '#8b9b9b' : '#9eafb3')
  body.addColorStop(0.7, '#ccd5cd')
  body.addColorStop(1, '#e8e9d8')
  const fin = c.createLinearGradient(0, 28, 30, 76)
  fin.addColorStop(0, '#607b85')
  fin.addColorStop(0.5, '#91a7a9')
  fin.addColorStop(1, '#455e6a')
  // Near/far webbed feet occupy parallel upright planes. A lateral stroke
  // changes their projected breadth; it does not kick two tail lobes up/down.
  function hind(near) {
    c.save()
    c.translate(35, 51)
    const depth = near ? 18 : -18
    const root = near ? 6 : -6
    c.scale(1 + beat * (near ? 0.13 : -0.13), 1)
    c.fillStyle = fin
    c.beginPath()
    c.moveTo(5, root - 2)
    c.bezierCurveTo(-5, root - 3, -15, depth - 14, -24, depth - 14)
    c.quadraticCurveTo(-28, depth - 14, -26, depth - 10)
    c.quadraticCurveTo(-31, depth - 11, -28, depth - 5)
    c.quadraticCurveTo(-33, depth - 6, -29, depth + 1)
    c.quadraticCurveTo(-33, depth + 3, -28, depth + 8)
    c.quadraticCurveTo(-29, depth + 14, -23, depth + 14)
    c.bezierCurveTo(-14, depth + 13, -5, root + 3, 5, root + 2)
    c.closePath()
    c.fill()
    c.strokeStyle = 'rgba(18,43,55,.6)'
    c.lineWidth = 0.65
    c.stroke()
    for (let i = 0; i < 4; i++) {
      c.beginPath()
      c.moveTo(0, root)
      c.quadraticCurveTo(-11, depth, -25, depth - 10 + i * 6)
      c.stroke()
    }
    c.restore()
  }
  hind(false)
  // Far foreflipper remains short and close to the shoulder.
  ellipse(c, 117, 50, 16, 5, '#4b6571', -0.35)
  const trunk = () => {
    c.beginPath()
    c.moveTo(30, 48)
    c.bezierCurveTo(55, 13, 106, 10, 138, 34)
    c.bezierCurveTo(147, 36, 153, 43, 153, 51)
    c.bezierCurveTo(146, 76, 79, 88, 48, 66)
    c.quadraticCurveTo(38, 58, 30, 48)
    c.closePath()
  }
  trunk()
  c.fillStyle = body
  c.fill()
  c.strokeStyle = 'rgba(14,39,52,.55)'
  c.lineWidth = 0.7
  c.stroke()
  ellipse(c, 143, 44, 24, 19, body, -0.1)
  // Stable, fine mottling and short fur strokes clipped to the torso.
  c.save()
  trunk()
  c.clip()
  const rnd = (i) => {
    const n = Math.sin(i * 127.1 + 19.7) * 43758.5453
    return n - Math.floor(n)
  }
  for (let i = 0; i < 95; i++) {
    const x = 35 + rnd(i) * 118,
      y = 20 + rnd(i + 150) * 49
    const r = 0.7 + rnd(i + 320) * 2
    if (coat === 'ringed') {
      c.strokeStyle = 'rgba(223,232,219,.6)'
      c.lineWidth = 0.6
      c.beginPath()
      c.ellipse(x, y, r * 1.5, r, -0.3, 0, Math.PI * 2)
      c.stroke()
    } else if (coat !== 'monk') {
      ellipse(
        c,
        x,
        y,
        r * 1.3,
        r * 0.75,
        coat === 'weddell' ? 'rgba(226,231,216,.38)' : 'rgba(45,66,75,.34)',
        -0.3,
      )
    }
  }
  c.strokeStyle = 'rgba(233,242,227,.17)'
  c.lineWidth = 0.28
  for (let i = 0; i < 700; i++) {
    const x = 32 + rnd(i + 1000) * 130,
      y = 17 + rnd(i + 2000) * 62
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + 1.5, y - 0.5)
    c.stroke()
  }
  c.restore()
  hind(true)
  // Short tapered tail blends into the rump: no closed outline across its root.
  c.fillStyle = body
  c.beginPath()
  c.moveTo(40, 45)
  c.bezierCurveTo(34, 46, 28, 49, 25, 51)
  c.quadraticCurveTo(24, 53, 29, 53)
  c.quadraticCurveTo(35, 53, 42, 55)
  c.closePath()
  c.fill()
  // Near foreflipper: compact rounded paw, five short blunt claws.
  c.save()
  c.translate(117, 59)
  c.rotate(beat * 0.07)
  c.fillStyle = fin
  c.beginPath()
  c.moveTo(2, -2)
  c.bezierCurveTo(-5, 0, -18, 9, -23, 16)
  c.bezierCurveTo(-25, 22, -17, 24, -8, 19)
  c.quadraticCurveTo(9, 10, 2, -2)
  c.fill()
  c.strokeStyle = 'rgba(27,50,59,.65)'
  c.lineWidth = 0.6
  c.stroke()
  for (let i = 0; i < 5; i++) {
    c.beginPath()
    c.moveTo(-21 + i * 2.6, 18.5 + Math.sin(i * 0.7) * 2)
    c.lineTo(-22 + i * 2.6, 20.5 + Math.sin(i * 0.7) * 2)
    c.stroke()
  }
  c.restore()
  // Ear opening (no external ear flap), glossy eye, blunt muzzle and whisker follicles.
  ellipse(c, 133, 40, 0.8, 1.3, '#526972')
  // Slight three-quarter muzzle: near eye forward, far eye partly visible.
  // SR-22: the user's three-quarter face reference, with two readable eyes.
  ellipse(c, 163.8, 38.5, 2.6, 3.1, '#172e39', -0.16)
  ellipse(c, 155.8, 39.5, 3.7, 4.1, '#203b47', -0.16)
  ellipse(c, 156.7, 38.2, 1.05, 1.05, '#f2faf2')
  ellipse(c, 164.5, 37.5, 0.75, 0.75, '#f2faf2')
  ellipse(c, 154.9, 41, 0.45, 0.45, '#8cabb1')
  ellipse(c, 160, 51, 12, 8.5, '#c7d1c5')
  ellipse(c, 156, 53, 7, 5.5, '#dce0cd')
  ellipse(c, 165, 49, 3.4, 2.7, '#233e47')
  c.strokeStyle = '#536a6c'
  c.lineWidth = 0.6
  c.beginPath()
  c.moveTo(164, 52)
  c.quadraticCurveTo(160, 57, 155, 55)
  c.stroke()
  for (let i = 0; i < 9; i++)
    ellipse(c, 154 + (i % 3) * 2.6, 49 + Math.floor(i / 3) * 2.2, 0.36, 0.36, '#526b70')
  c.strokeStyle = 'rgba(234,241,219,.88)'
  c.lineWidth = 0.45
  for (let i = 0; i < 5; i++) {
    c.beginPath()
    c.moveTo(157, 50 + i * 1.4)
    c.quadraticCurveTo(168, 48 + i * 2.3, 178, 45 + i * 3.8)
    c.stroke()
  }
  c.restore()
}

const oceanImages = new Map()
const pendingImages = new Map()
const previews = new WeakMap()
// All paths are local, versioned art. A missing image leaves the procedural scene playable.
export function loadOcean(biome, thumbnail = false) {
  const key = biome + (thumbnail ? ':thumb' : '')
  if (oceanImages.has(key)) return Promise.resolve(oceanImages.get(key))
  if (pendingImages.has(key)) return pendingImages.get(key)
  const pending = new Promise((resolve) => {
    const img = new Image()
    let done = false
    const finish = (ok) => {
      if (done) return
      done = true
      clearTimeout(timer)
      if (ok) oceanImages.set(key, img)
      pendingImages.delete(key)
      resolve(ok ? img : null)
    }
    const timer = setTimeout(() => finish(false), 6000)
    img.onload = () => finish(true)
    img.onerror = () => finish(false)
    img.src = new URL(
      '../assets/' + biome + '-v1' + (thumbnail ? '-thumb' : '') + '.webp',
      import.meta.url,
    ).href
  })
  pendingImages.set(key, pending)
  return pending
}
function drawPlate(c, img, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / scale,
    sh = h / scale
  c.drawImage(img, (img.naturalWidth - sw) / 2, img.naturalHeight - sh, sw, sh, 0, 0, w, h)
}
export function paintHero(canvas, biome) {
  canvas.width = 1080
  canvas.height = 576
  const c = canvas.getContext('2d')
  c.clearRect(0, 0, canvas.width, canvas.height)
  const token = {}
  heroPreviews.set(canvas, token)
  if (biome === 'atlantis' || biome === 'antarctic') {
    loadGeneratedHero(biome)
      .then((img) => {
        if (!img || heroPreviews.get(canvas) !== token) return
        c.clearRect(0, 0, canvas.width, canvas.height)
        const scale = Math.min(994 / img.width, 530 / img.height)
        c.drawImage(
          img,
          (1080 - img.width * scale) / 2,
          (576 - img.height * scale) / 2,
          img.width * scale,
          img.height * scale,
        )
      })
      .catch(() => {}) // Play exposes the recoverable asset error.
  }
  // 4% transparent margin contains every whisker/toe on narrow screens.
  c.save()
  c.translate(43, 23)
  drawPhocid(c, 994, 530, BIOMES[biome].coat, 0.15)
  c.restore()
}

export function paintOcean(c, w, h, biome, layer = 'all') {
  const image = oceanImages.get(biome)
  if (image) {
    if (layer === 'all' || layer === 'water') drawPlate(c, image, w, h)
    else {
      c.save()
      c.globalAlpha = layer === 'far' ? 0.12 : 0.22
      for (let i = 0; i < 24; i++) {
        const x = (((i * 137 + (layer === 'mid' ? 61 : 0)) % 1200) / 1200) * w
        const y = (((i * 79 + 29) % 675) / 675) * h
        ellipse(c, x, y, layer === 'far' ? 1 : 1.5, 1, BIOMES[biome].light)
      }
      c.restore()
    }
    return
  }
  const b = BIOMES[biome] || BIOMES.coastal
  c.save()
  c.scale(w / 1200, h / 675)
  if (layer === 'all' || layer === 'water') {
    const g = c.createLinearGradient(0, 0, 0, 675)
    g.addColorStop(0, b.surface)
    g.addColorStop(0.3, b.mid)
    g.addColorStop(0.72, b.deep)
    g.addColorStop(1, b.floor)
    c.fillStyle = g
    c.fillRect(0, 0, 1200, 675)
    // Soft angled sunlight stays behind all gameplay objects.
    for (let i = 0; i < 5; i++) {
      const x = 170 + i * 251
      c.globalAlpha = 0.055
      polygon(
        c,
        [
          [x, 0],
          [x + 50, 0],
          [x - 180, 630],
          [x - 370, 675],
        ],
        b.light,
      )
    }
    c.globalAlpha = 1
    c.strokeStyle = b.light
    c.globalAlpha = 0.16
    c.lineWidth = 2
    for (let i = 0; i < 24; i++) {
      const x = i * 57
      c.beginPath()
      c.ellipse(x, 14 + (i % 3) * 5, 28, 3, 0, 0, Math.PI * 2)
      c.stroke()
    }
    c.globalAlpha = 1
  }
  if (layer === 'all' || layer === 'far') {
    c.globalAlpha = 0.19
    for (let i = 0; i < 9; i++) {
      const x = i * 160 - 40,
        tall = 105 + ((i * 79) % 220)
      if (biome === 'atlantis') {
        c.fillStyle = b.scenery
        c.fillRect(x, 675 - tall, 27, tall)
        c.fillRect(x + 66, 675 - tall, 27, tall)
        c.lineWidth = 24
        c.strokeStyle = b.scenery
        c.beginPath()
        c.arc(x + 46, 675 - tall, 34, Math.PI, 0)
        c.stroke()
      } else if (biome === 'arctic' || biome === 'antarctic') {
        polygon(
          c,
          [
            [x, 0],
            [x + 190, 0],
            [x + 153, tall],
            [x + 85, tall + 70],
            [x + 32, tall - 45],
          ],
          b.light,
        )
      } else
        polygon(
          c,
          [
            [x - 90, 675],
            [x - 5, 675 - tall],
            [x + 45, 655 - tall],
            [x + 130, 675],
          ],
          b.scenery,
        )
    }
    c.globalAlpha = 0.24
    for (let i = 0; i < 34; i++) {
      const x = (i * 131) % 1200,
        y = 180 + ((i * 71) % 300)
      ellipse(c, x, y, 4, 1.2, b.light)
    }
    c.globalAlpha = 1
  }
  if (layer === 'all' || layer === 'mid') {
    const cold = biome === 'arctic' || biome === 'antarctic'
    for (let i = 0; i < 13; i++) {
      const x = i * 109 + 16,
        tall = 65 + ((i * 43) % 175)
      if (cold) {
        c.globalAlpha = 0.32
        polygon(
          c,
          [
            [x - 50, 675],
            [x - 6, 675 - tall],
            [x + 22, 675 - tall - 18],
            [x + 75, 675],
          ],
          b.scenery,
        )
        polygon(
          c,
          [
            [x - 6, 675 - tall],
            [x + 22, 675 - tall - 18],
            [x + 37, 675 - tall + 28],
          ],
          b.light,
        )
      } else if (biome === 'atlantis') {
        c.globalAlpha = 0.35
        polygon(
          c,
          [
            [x, 675],
            [x - 12, 675 - tall / 2],
            [x + 34, 675 - tall / 2 - 12],
            [x + 56, 675],
          ],
          b.scenery,
        )
        c.strokeStyle = b.light
        c.lineWidth = 2
        c.beginPath()
        c.moveTo(x + 4, 675 - tall / 2 + 5)
        c.lineTo(x + 31, 675 - tall / 2)
        c.stroke()
      } else {
        c.globalAlpha = 0.5
        c.strokeStyle = b.scenery
        c.lineWidth = biome === 'tropical' ? 5 : 8
        c.beginPath()
        c.moveTo(x, 675)
        c.bezierCurveTo(x + 35, 675 - tall / 3, x - 34, 675 - tall * 0.8, x + 8, 675 - tall)
        c.stroke()
        for (let j = 1; j < 5; j++) {
          const y = 675 - (tall * j) / 5,
            side = j % 2 ? 1 : -1
          ellipse(
            c,
            x + side * 10,
            y,
            biome === 'tropical' ? 11 : 19,
            biome === 'tropical' ? 8 : 4,
            b.scenery,
            side * -0.7,
          )
        }
      }
    }
    c.globalAlpha = 1
  }
  c.restore()
}
export function paintPreview(canvas, biome, hero = false) {
  canvas.width = hero ? 1600 : 320
  canvas.height = hero ? 900 : 180
  const c = canvas.getContext('2d')
  paintOcean(c, canvas.width, canvas.height, biome)
  const token = {}
  previews.set(canvas, token)
  loadOcean(biome, !hero).then((img) => {
    if (img && previews.get(canvas) === token) drawPlate(c, img, canvas.width, canvas.height)
  })
}
export function buildExpeditionTextures(scene, biome) {
  buildTextures(scene)
  const owned = []
  scene.events.once('shutdown', () => {
    for (const key of owned) scene.textures.remove(key)
  })
  const add = (key, w, h, draw, resolution = 2) => {
    if (scene.textures.exists(key)) return
    const canvas = document.createElement('canvas')
    canvas.width = w * resolution
    canvas.height = h * resolution
    const c = canvas.getContext('2d')
    c.scale(resolution, resolution)
    draw(c, w, h)
    scene.textures.addCanvas(key, canvas)
    owned.push(key)
  }
  if (!faunaId('seal', biome))
    for (let frame = 0; frame < 8; frame++)
      add('seal_' + biome + '_' + frame, 180, 96, (c, w, h) =>
        drawPhocid(c, w, h, BIOMES[biome].coat, frame / 8),
      )
  const b = BIOMES[biome]
  add('rock_' + biome, 120, 120, (c) => {
    const icy = biome === 'arctic' || biome === 'antarctic',
      g = c.createLinearGradient(0, 0, 110, 120)
    g.addColorStop(0, icy ? '#d4e8e9' : '#90a3a1')
    g.addColorStop(1, icy ? '#648aaa' : '#3b616b')
    polygon(
      c,
      [
        [17, 6],
        [76, 0],
        [114, 26],
        [119, 90],
        [91, 117],
        [30, 119],
        [0, 82],
        [4, 29],
      ],
      g,
    )
    // A quiet, continuous rim identifies solid terrain against photographic rocks.
    c.strokeStyle = icy ? '#39566a' : '#d0d8bd'
    c.lineWidth = 2
    c.stroke()
    polygon(
      c,
      [
        [17, 6],
        [76, 0],
        [53, 28],
        [4, 29],
      ],
      icy ? '#e7f4ed' : '#bac1ae',
    )
    polygon(
      c,
      [
        [53, 28],
        [76, 0],
        [114, 26],
        [90, 74],
        [40, 101],
      ],
      icy ? '#aacbd8' : '#6a858a',
    )
    c.strokeStyle = b.floor
    c.globalAlpha = 0.45
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(4, 51)
    c.lineTo(38, 57)
    c.lineTo(52, 80)
    c.stroke()
    c.globalAlpha = 1
  })
}
