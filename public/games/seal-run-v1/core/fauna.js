// SR-06/19: anatomy/region references in docs/seal-run-anatomy-references.md.
import { TEXTURES } from './theme.js'
export const FAUNA = Object.freeze({
  porbeagle: { scientific: 'Lamna nasus', w: 340, h: 238, originX: 168 / 400, originY: 144 / 280 },
  'white-shark': {
    scientific: 'Carcharodon carcharias',
    w: 470,
    h: 329,
    originX: 192 / 400,
    originY: 140 / 280,
  },
  'galapagos-shark': {
    scientific: 'Carcharhinus galapagensis',
    w: 340,
    h: 238,
    originX: 178 / 400,
    originY: 158 / 280,
  },
  'tiger-shark': {
    scientific: 'Galeocerdo cuvier',
    w: 470,
    h: 329,
    originX: 174 / 400,
    originY: 150 / 280,
  },
  'orca-northern': {
    scientific: 'Orcinus orca',
    w: 420,
    h: 294,
    originX: 188 / 400,
    originY: 166 / 280,
  },
  'orca-antarctic': {
    scientific: 'Orcinus orca',
    w: 420,
    h: 294,
    originX: 184 / 400,
    originY: 160 / 280,
  },
  'grey-seal': {
    scientific: 'Halichoerus grypus',
    w: 196,
    h: 137.2,
    originX: 210 / 400,
    originY: 152 / 280,
  },
})
export function faunaId(kind, biome) {
  if (kind === 'seal') return biome === 'atlantis' ? 'grey-seal' : null
  if (kind === 'orca') return biome === 'antarctic' ? 'orca-antarctic' : 'orca-northern'
  if (biome === 'arctic' || biome === 'antarctic') return null
  if (kind === 'shark_white') return biome === 'tropical' ? 'galapagos-shark' : 'porbeagle'
  if (kind === 'shark_big') return biome === 'tropical' ? 'tiger-shark' : 'white-shark'
  return null
}
export function actorSize(kind, biome) {
  return FAUNA[faunaId(kind, biome)] ?? TEXTURES[kind]
}
