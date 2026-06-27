import type { TopicSlug } from '../content/topics'

/**
 * Демо-наполнение для M1-T01–T04: реальные записи в Payload (Content + Species),
 * RU/EN, чтобы шаблоны/каталог/фильтры/Тюленепедия рендерились из БД, а не из mock.
 * Это НЕ финальный контент (перенос из VK/TG — M1-T06/07); идемпотентный посев.
 */

type L = { ru: string; en: string }
type Paras = { ru: string[]; en: string[] }

export interface ContentSeed {
  type: 'article' | 'news' | 'meme' | 'page'
  slug: string
  title: L
  excerpt?: L
  topics?: TopicSlug[]
  aiGenerated?: boolean
  body?: Paras
}

export interface GameSeed {
  slug: string
  title: L
  excerpt?: L
  how?: L
  embed?: string
  showCover?: boolean
  coverSeed?: number
  order?: number
}

export interface SpeciesSeed {
  slug: string
  name: L
  latin: string
  conservationStatus?: 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'DD'
  region?: L
  size?: L
  excerpt?: L
  facts: L[]
  aiGenerated?: boolean
  body?: Paras
}

export const contentSeed: ContentSeed[] = [
  {
    type: 'article',
    slug: 'why-seals-cry',
    title: { ru: 'Почему тюлени «плачут» (спойлер: не от грусти)', en: 'Why seals “cry” (spoiler: not from sadness)' },
    excerpt: {
      ru: 'У тюленей нет слёзных протоков, как у нас. Разбираем, зачем им «мокрые глаза».',
      en: 'Seals lack tear ducts like ours. We unpack what those “wet eyes” are really for.',
    },
    topics: ['biology', 'science'],
    aiGenerated: true,
    body: {
      ru: [
        'Слёзные железы увлажняют и защищают глаза в солёной воде. Без носослёзного канала жидкость просто стекает по морде — отсюда «слёзы».',
        'Так что мокрые глаза тюленя — это не эмоции, а исправно работающая защита от соли и песка.',
      ],
      en: [
        'Tear glands keep the eyes moist and protected in salt water. Without a nasolacrimal duct, the fluid simply runs down the face — hence the “tears”.',
        'So a seal’s wet eyes are not emotion but a perfectly working defence against salt and sand.',
      ],
    },
  },
  {
    type: 'article',
    slug: 'how-seals-sleep',
    title: { ru: 'Как тюлени спят в воде', en: 'How seals sleep in the water' },
    excerpt: { ru: 'Полушарный сон и «бутылкование» столбиком.', en: 'Hemispheric sleep and vertical “bottling”.' },
    topics: ['biology', 'behavior'],
    body: {
      ru: ['Тюлени умеют спать, держа одно полушарие мозга бодрствующим, и зависать «столбиком» у поверхности — это называют бутылкованием.'],
      en: ['Seals can sleep with one brain hemisphere awake and hang vertically near the surface — a posture called bottling.'],
    },
  },
  {
    type: 'article',
    slug: 'seal-whiskers',
    title: { ru: 'Усы как сенсоры: вибриссы тюленя', en: 'Whiskers as sensors: a seal’s vibrissae' },
    excerpt: { ru: 'Чувствуют след рыбы в тёмной воде.', en: 'They track a fish’s wake in dark water.' },
    topics: ['biology', 'science'],
    body: {
      ru: ['Вибриссы тюленя ловят гидродинамический след рыбы — он сохраняется в воде секундами, и тюлень идёт по нему даже в полной темноте.'],
      en: ['A seal’s vibrissae detect the hydrodynamic wake of a fish — it lingers in the water for seconds, and the seal follows it even in total darkness.'],
    },
  },
  {
    type: 'news',
    slug: 'baltic-center-released-pups',
    title: { ru: 'Центр на Балтике выпустил пять тюленят', en: 'A Baltic centre released five seal pups' },
    excerpt: { ru: 'После реабилитации малышей вернули в море.', en: 'After rehab, the pups were returned to the sea.' },
    topics: ['rescue', 'conservation'],
    body: {
      ru: ['Пятерых тюленят, набравших вес после реабилитации, выпустили обратно в Балтийское море.'],
      en: ['Five seal pups, having gained weight in rehab, were released back into the Baltic Sea.'],
    },
  },
  {
    type: 'news',
    slug: 'new-rookery-spotted',
    title: { ru: 'Новое лежбище заметили волонтёры', en: 'Volunteers spotted a new rookery' },
    excerpt: { ru: 'Просят не подходить близко в сезон линьки.', en: 'They ask people to keep away during moulting season.' },
    topics: ['conservation'],
    body: {
      ru: ['Волонтёры зафиксировали новое лежбище и просят держаться поодаль — особенно в сезон линьки, когда тюлени особенно уязвимы.'],
      en: ['Volunteers recorded a new rookery and ask people to keep their distance — especially during moulting season, when seals are most vulnerable.'],
    },
  },
  {
    type: 'meme',
    slug: 'meme-blep',
    title: { ru: 'Когда показал язык и не жалеешь', en: 'When you blep and regret nothing' },
    topics: ['humor'],
  },
  {
    type: 'meme',
    slug: 'meme-monday-seal',
    title: { ru: 'Я в понедельник', en: 'Me on a Monday' },
    topics: ['humor'],
  },
  {
    type: 'meme',
    slug: 'meme-banana-pose',
    title: { ru: 'Поза банан — это лук, а не лень', en: 'The banana pose is a look, not laziness' },
    topics: ['humor'],
  },
  {
    type: 'page',
    slug: 'about',
    title: { ru: 'О проекте', en: 'About' },
    excerpt: { ru: 'Что такое Тюлень.Инфо.', en: 'What SeaLife.Info is.' },
    body: {
      ru: ['Тюлень.Инфо — медиа-хаб о тюленях: факты, новости, мемы и квизы. Серьёзная часть — про спасение — живёт на соседнем сайте.'],
      en: ['SeaLife.Info is a media hub about seals: facts, news, memes and quizzes. The serious part — about rescue — lives on the sister site.'],
    },
  },
]

export const gamesSeed: GameSeed[] = [
  {
    slug: 'seal-the-hunter',
    title: { ru: 'Тюль-Охотник', en: 'Seal The Hunter' },
    excerpt: { ru: 'Лови рыбу тюленем за 60 секунд.', en: 'Hunt fish as a seal in 60 seconds.' },
    how: {
      ru: 'Управление: тяни/веди указателем или стрелками — тюлень плывёт за курсором. Цель: поймать как можно больше рыбы за 60 секунд. Кнопки «Старт», «Пауза» и звук — на панели игры.',
      en: 'Controls: drag/point or use arrow keys — the seal follows the cursor. Goal: catch as many fish as you can in 60 seconds. Start, Pause and sound buttons are in the game toolbar.',
    },
    embed: '/games/seal-hunt-v1/index.html',
    showCover: false,
    order: 0,
  },
]

export const speciesSeed: SpeciesSeed[] = [
  {
    slug: 'baltic-ringed-seal',
    name: { ru: 'Балтийская кольчатая нерпа', en: 'Baltic ringed seal' },
    latin: 'Pusa hispida botnica',
    conservationStatus: 'VU',
    region: { ru: 'Балтийское море', en: 'Baltic Sea' },
    size: { ru: '≈ 1.3 м', en: '≈ 1.3 m' },
    excerpt: { ru: 'Маленькая нерпа с «кольцами» на шкуре.', en: 'A small seal with “rings” on its coat.' },
    facts: [
      { ru: 'Делает снежные норы для детёнышей.', en: 'Builds snow lairs for its pups.' },
      { ru: 'Под угрозой из-за таяния льда.', en: 'Threatened by shrinking ice.' },
    ],
    body: {
      ru: ['Кольчатая нерпа Балтики зависит от льда: на нём она рожает и выкармливает детёнышей в снежных норах.'],
      en: ['The Baltic ringed seal depends on ice: it gives birth and nurses its pups in snow lairs built on it.'],
    },
  },
  {
    slug: 'grey-seal',
    name: { ru: 'Серый тюлень', en: 'Grey seal' },
    latin: 'Halichoerus grypus',
    conservationStatus: 'LC',
    region: { ru: 'Северная Атлантика, Балтика', en: 'North Atlantic, Baltic' },
    size: { ru: '≈ 2 м', en: '≈ 2 m' },
    excerpt: { ru: '«Лошадиная морда» — буквально из латыни.', en: 'The “hook-nosed sea pig”, literally from Latin.' },
    facts: [{ ru: 'Самцы заметно крупнее самок.', en: 'Males are noticeably larger than females.' }],
    body: {
      ru: ['Серый тюлень — один из крупнейших хищников Балтики; узнаётся по вытянутой «лошадиной» морде.'],
      en: ['The grey seal is one of the Baltic’s largest predators, recognised by its long “horse-like” muzzle.'],
    },
  },
  {
    slug: 'harbour-seal',
    name: { ru: 'Обыкновенный тюлень', en: 'Harbour seal' },
    latin: 'Phoca vitulina',
    conservationStatus: 'LC',
    region: { ru: 'Побережья Северного полушария', en: 'Northern-hemisphere coasts' },
    size: { ru: '≈ 1.7 м', en: '≈ 1.7 m' },
    excerpt: { ru: 'Тот самый «улыбающийся» тюлень с пятнами.', en: 'The classic spotted, “smiling” seal.' },
    facts: [{ ru: 'Детёныши плавают почти сразу после рождения.', en: 'Pups can swim almost immediately after birth.' }],
    body: {
      ru: ['Обыкновенный тюлень держится у берегов и устьев рек; именно его чаще всего находят люди на пляжах.'],
      en: ['The harbour seal stays near coasts and river mouths; it is the one people most often find on beaches.'],
    },
  },
]
