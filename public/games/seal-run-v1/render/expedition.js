// SR-06/SR-19. Original Canvas artwork: no downloaded assets or runtime image requests.
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

// Phocid silhouette: small head, no external ear pinnae, short foreflippers,
// tapering trunk, two separately articulated hindflippers. No cetacean tail fluke.
export function drawPhocid(c, w, h, coat = 'spotted', phase = 0) {
  c.save()
  c.scale(w / 180, h / 96)
  const stroke = Math.sin(phase * Math.PI * 2),
    dark = coat === 'monk' ? '#536875' : '#516775'
  const body = c.createLinearGradient(0, 17, 0, 80)
  body.addColorStop(0, coat === 'weddell' ? '#5e7485' : '#81959f')
  body.addColorStop(0.42, '#b5c7cc')
  body.addColorStop(1, '#e5e9dc')
  // Far hindflipper, then trunk, then nearer hindflipper.
  polygon(
    c,
    [
      [43, 49],
      [10, 28 + stroke * 9],
      [3, 34 + stroke * 7],
      [9, 44 + stroke * 5],
      [34, 59],
    ],
    dark,
  )
  c.fillStyle = body
  c.beginPath()
  c.moveTo(30, 48)
  c.bezierCurveTo(55, 13, 106, 10, 138, 34)
  c.bezierCurveTo(147, 36, 153, 43, 153, 51)
  c.bezierCurveTo(146, 76, 79, 88, 48, 66)
  c.quadraticCurveTo(38, 58, 30, 48)
  c.fill()
  // Small, blunt, continuous head-neck profile.
  ellipse(c, 143, 44, 24, 19, body, -0.1)
  ellipse(c, 159, 51, 13, 10, '#d7dfd8')
  // Hindflipper fingers fan out from the tapered pelvis, never a central tail.
  polygon(
    c,
    [
      [42, 53],
      [12, 62 + stroke * 8],
      [3, 72 + stroke * 10],
      [13, 76 + stroke * 9],
      [45, 64],
    ],
    '#728a94',
  )
  c.strokeStyle = '#476371'
  c.lineWidth = 1
  for (let i = 0; i < 3; i++) {
    c.beginPath()
    c.moveTo(38, 59)
    c.lineTo(10 + i * 4, 69 + stroke * 9 + i * 2)
    c.stroke()
  }
  // Short foreflipper folded alongside the body; hindquarters provide propulsion.
  c.fillStyle = '#647d89'
  c.beginPath()
  c.moveTo(119, 59)
  c.quadraticCurveTo(121, 70, 102, 82 + stroke * 2)
  c.quadraticCurveTo(93, 82, 100, 73)
  c.lineTo(108, 58)
  c.fill()
  if (coat !== 'monk') {
    for (let i = 0; i < 52; i++) {
      const x = 49 + ((((Math.sin(i * 127.1 + 41) * 43758.5453) % 1) + 1) % 1) * 81,
        y = 27 + ((((Math.sin(i * 311.7 + 19) * 23711.231) % 1) + 1) % 1) * 44
      if (((x - 88) / 48) ** 2 + ((y - 48) / 28) ** 2 > 1) continue
      if (coat === 'ringed') {
        c.strokeStyle = '#dfdfcd'
        c.lineWidth = 1.5
        c.beginPath()
        c.ellipse(x, y, 3.8, 2.8, -0.25, 0, Math.PI * 2)
        c.stroke()
      } else
        ellipse(
          c,
          x,
          y,
          coat === 'weddell' ? 3.2 : 1.9,
          coat === 'weddell' ? 1.7 : 1.3,
          coat === 'weddell' ? '#d7dfd8' : '#6b818b',
          -0.2,
        )
    }
  }
  // Tiny ear opening behind the eye, never an external flap.
  ellipse(c, 132, 42, 1.2, 1.6, '#667b83')
  ellipse(c, 151, 41, 3.1, 3.5, '#152f3c')
  ellipse(c, 152, 40, 1, 1, '#fbf5df')
  ellipse(c, 169, 48, 3.2, 2.4, '#243e49')
  c.strokeStyle = '#4b6670'
  c.lineWidth = 0.8
  for (let i = 0; i < 4; i++) {
    c.beginPath()
    c.moveTo(161, 53 + i * 0.8)
    c.quadraticCurveTo(170, 52 + i * 2, 178, 49 + i * 4)
    c.stroke()
  }
  c.beginPath()
  c.moveTo(158, 57)
  c.quadraticCurveTo(164, 59, 169, 54)
  c.stroke()
  c.restore()
}

export function paintOcean(c, w, h, biome, layer = 'all') {
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
  const ratio = hero ? 2 : 1
  canvas.width = 1200 * ratio
  canvas.height = 675 * ratio
  const c = canvas.getContext('2d')
  paintOcean(c, canvas.width, canvas.height, biome)
  if (hero) {
    c.save()
    c.translate(canvas.width * 0.56, canvas.height * 0.28)
    c.rotate(-0.09)
    drawPhocid(c, canvas.width * 0.37, canvas.height * 0.35, BIOMES[biome].coat, 0.15)
    c.restore()
    for (let i = 0; i < 7; i++) {
      const x = canvas.width * (0.77 + i * 0.025),
        y = canvas.height * (0.66 + Math.sin(i) * 0.025)
      ellipse(c, x, y, 9, 3, BIOMES[biome].light)
    }
  }
}
export function buildExpeditionTextures(scene, biome) {
  buildTextures(scene)
  const add = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return
    const canvas = document.createElement('canvas')
    canvas.width = w * 2
    canvas.height = h * 2
    const c = canvas.getContext('2d')
    c.scale(2, 2)
    draw(c, w, h)
    scene.textures.addCanvas(key, canvas)
  }
  for (let frame = 0; frame < 8; frame++)
    add('seal_' + biome + '_' + frame, 100, 56, (c, w, h) =>
      drawPhocid(c, w, h, BIOMES[biome].coat, frame / 8),
    )
  for (const layer of ['water', 'far', 'mid'])
    add('ocean_' + biome + '_' + layer, 1200, 675, (c, w, h) => paintOcean(c, w, h, biome, layer))
  // Predatory leopard seals use an elongated phocid profile with a larger head.
  for (const [key, w, h] of [
    ['leopard_seal', 118, 78],
    ['leopard_seal_big', 150, 102],
  ])
    add(key, w, h, (c, w, h) => {
      c.save()
      c.translate(w, 0)
      c.scale(-1, 1)
      drawPhocid(c, w, h, 'weddell', 0.2)
      c.restore()
    })
  add('polar_bear', 118, 86, (c) => {
    ellipse(c, 55, 45, 49, 27, '#e1e8db')
    ellipse(c, 99, 36, 17, 18, '#edf0df')
    ellipse(c, 107, 46, 13, 8, '#e1e8db')
    ellipse(c, 94, 22, 5, 6, '#e1e8db')
    ellipse(c, 105, 32, 2, 2, '#19384a')
    ellipse(c, 115, 43, 3, 3, '#19384a')
    for (const x of [29, 76]) ellipse(c, x, 69, 10, 15, '#c5d3cf', -0.3)
  })
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
