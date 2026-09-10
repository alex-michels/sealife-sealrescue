// SR-19: semantic art/location data, shared by menu, renderer, course builder and Node.
export const BIOMES = Object.freeze({
  coastal: {
    name: { en: 'Kelp coast', ru: 'Берег ламинарии' },
    species: { en: 'Harbour seal', ru: 'Обыкновенный тюлень' },
    scientific: 'Phoca vitulina',
    accent: '#aee4b8',
    surface: '#438caa',
    mid: '#175363',
    deep: '#102f48',
    floor: '#081c31',
    scenery: '#528c87',
    light: '#e9dfb2',
    coat: 'spotted',
    description: {
      en: 'Follow the silver shoals through a swaying kelp forest.',
      ru: 'Следуй за серебристой рыбой сквозь лес ламинарии.',
    },
  },
  atlantis: {
    name: { en: 'Lost Atlantis', ru: 'Затонувшая Атлантида' },
    species: { en: 'Harbour seal · fantasy setting', ru: 'Обыкновенный тюлень · мир фантазии' },
    scientific: 'Phoca vitulina',
    accent: '#dfc99a',
    surface: '#4e7595',
    mid: '#263e67',
    deep: '#172443',
    floor: '#0d1630',
    scenery: '#7e8d98',
    light: '#edc994',
    coat: 'spotted',
    description: {
      en: 'Find a way between ancient arches and fallen columns.',
      ru: 'Найди путь между древними арками и упавшими колоннами.',
    },
  },
  tropical: {
    name: { en: 'Hawaiian blue', ru: 'Гавайская лазурь' },
    species: { en: 'Hawaiian monk seal', ru: 'Гавайский тюлень-монах' },
    scientific: 'Neomonachus schauinslandi',
    accent: '#f4d59b',
    surface: '#409cb5',
    mid: '#196e8b',
    deep: '#124967',
    floor: '#0d2e49',
    scenery: '#57959c',
    light: '#fff0ba',
    coat: 'monk',
    description: {
      en: 'Sunlit reefs, coral gardens and a little open-ocean courage.',
      ru: 'Солнечные рифы, коралловые сады и немного океанской смелости.',
    },
  },
  arctic: {
    name: { en: 'Arctic passage', ru: 'Арктический пролив' },
    species: { en: 'Ringed seal', ru: 'Кольчатая нерпа' },
    scientific: 'Pusa hispida',
    accent: '#c0e9f1',
    surface: '#598fa7',
    mid: '#2b5571',
    deep: '#1c3654',
    floor: '#101e38',
    scenery: '#88b6c8',
    light: '#d9f5ff',
    coat: 'ringed',
    description: {
      en: 'Slip below the pack ice. Keep an eye on the surface.',
      ru: 'Проскользни под паковым льдом. Следи за поверхностью.',
    },
  },
  antarctic: {
    name: { en: 'Antarctic blue', ru: 'Синяя Антарктида' },
    species: { en: 'Weddell seal', ru: 'Тюлень Уэдделла' },
    scientific: 'Leptonychotes weddellii',
    accent: '#c7d3ff',
    surface: '#637da8',
    mid: '#344c76',
    deep: '#223559',
    floor: '#111f3b',
    scenery: '#8fa9ca',
    light: '#e5eaff',
    coat: 'weddell',
    description: {
      en: 'One last passage beneath the towering southern ice.',
      ru: 'Последний пролив под исполинскими льдами юга.',
    },
  },
})
export const BIOME_IDS = Object.freeze(Object.keys(BIOMES))
export const EXPEDITION = Object.freeze(['coastal', 'atlantis', 'tropical', 'arctic', 'antarctic'])
export const RULES_VERSION = 'expedition-1'
export const MAX_ROUNDS = EXPEDITION.length
export const MAX_EXPEDITION_SCORE = 500_000
export function roundSeed(season, index) {
  return `${RULES_VERSION}:${season}:${index}`
}
export function roundSpeed(index) {
  return 1 + Math.min(MAX_ROUNDS - 1, Math.max(0, index)) * 0.035
}
