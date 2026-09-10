// Biome-specific geometry derives from linted coastal patterns, then adds authored passages.
import { CHUNKS } from './index.js'
import { BIOME_IDS } from '../biomes.js'

function adapt(chunk, biome, index) {
  const mirror =
    biome === 'atlantis' || biome === 'antarctic' || (biome === 'tropical' && index % 2 === 0)
  const band = (b) => (mirror ? 4 - b : b)
  const obstacles = chunk.obstacles.map((o) => {
    const next = { ...o, band: band(o.band) }
    if (biome === 'arctic' && o.type.startsWith('shark')) {
      next.type = 'polar_bear'
      next.band = 0
    }
    if (biome === 'antarctic' && o.type === 'shark_white') next.type = 'leopard_seal'
    if (biome === 'antarctic' && o.type === 'shark_big') next.type = 'leopard_seal_big'
    return next
  })
  return {
    ...chunk,
    id: `${biome}-${String(index + 1).padStart(2, '0')}`,
    biome,
    obstacles,
    fish: chunk.fish.map((f) => ({ ...f, band: band(f.band) })),
  }
}

function passage(biome, alternate) {
  const upper = alternate ? 1 : 3
  return {
    id: `${biome}-${alternate ? '20' : '19'}`,
    biome,
    difficulty: alternate ? 4 : 2,
    intense: false,
    lenLu: 1200,
    obstacles: [
      { type: 'rock', band: upper, atLu: 480, w: 100, h: 140 },
      ...(alternate ? [{ type: 'rock', band: 3, atLu: 950, w: 100, h: 100 }] : []),
    ],
    fish: [180, 360, 600, 840, 1080].map((atLu) => ({ type: 'fish_small', band: 2, atLu })),
  }
}

export const ALL_CHUNKS = Object.freeze(
  BIOME_IDS.flatMap((biome) => [
    ...(biome === 'coastal' ? CHUNKS : CHUNKS.map((c, i) => adapt(c, biome, i))),
    passage(biome, false),
    passage(biome, true),
  ]).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
)
