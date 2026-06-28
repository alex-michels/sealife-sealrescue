import type { TopicSlug } from '../content/topics'

/**
 * Демо-наполнение для M1-T01–T04: реальные записи в Payload (Content + Species),
 * RU/EN/DE, чтобы шаблоны/каталог/фильтры/Тюленепедия рендерились из БД, а не из mock.
 * Это НЕ финальный контент (перенос из VK/TG — M1-T06/07); идемпотентный посев.
 *
 * `de` опционален в типах; seedM1 пишет `de ?? en`, поэтому непереведённые поля
 * деградируют на en, а не ломают посев.
 */

type L = { ru: string; en: string; de?: string }
type Paras = { ru: string[]; en: string[]; de?: string[] }

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
    title: {
      ru: 'Почему тюлени «плачут» (спойлер: не от грусти)',
      en: 'Why seals “cry” (spoiler: not from sadness)',
      de: 'Warum Robben „weinen“ (Spoiler: nicht aus Trauer)',
    },
    excerpt: {
      ru: 'У тюленей нет слёзных протоков, как у нас. Разбираем, зачем им «мокрые глаза».',
      en: 'Seals lack tear ducts like ours. We unpack what those “wet eyes” are really for.',
      de: 'Robben haben keine Tränenkanäle wie wir. Wir erklären, wozu die „nassen Augen“ wirklich da sind.',
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
      de: [
        'Tränendrüsen halten die Augen im Salzwasser feucht und geschützt. Ohne Tränennasengang läuft die Flüssigkeit einfach über das Gesicht — daher die „Tränen“.',
        'Die nassen Augen einer Robbe sind also keine Emotion, sondern ein einwandfrei funktionierender Schutz vor Salz und Sand.',
      ],
    },
  },
  {
    type: 'article',
    slug: 'how-seals-sleep',
    title: { ru: 'Как тюлени спят в воде', en: 'How seals sleep in the water', de: 'Wie Robben im Wasser schlafen' },
    excerpt: {
      ru: 'Полушарный сон и «бутылкование» столбиком.',
      en: 'Hemispheric sleep and vertical “bottling”.',
      de: 'Halbseitiger Schlaf und senkrechtes „Bottling“.',
    },
    topics: ['biology', 'behavior'],
    body: {
      ru: ['Тюлени умеют спать, держа одно полушарие мозга бодрствующим, и зависать «столбиком» у поверхности — это называют бутылкованием.'],
      en: ['Seals can sleep with one brain hemisphere awake and hang vertically near the surface — a posture called bottling.'],
      de: ['Robben können mit einer wachen Hirnhälfte schlafen und senkrecht nahe der Oberfläche treiben — eine Haltung, die man Bottling nennt.'],
    },
  },
  {
    type: 'article',
    slug: 'seal-whiskers',
    title: {
      ru: 'Усы как сенсоры: вибриссы тюленя',
      en: 'Whiskers as sensors: a seal’s vibrissae',
      de: 'Schnurrhaare als Sensoren: die Vibrissen der Robbe',
    },
    excerpt: {
      ru: 'Чувствуют след рыбы в тёмной воде.',
      en: 'They track a fish’s wake in dark water.',
      de: 'Sie erspüren die Spur eines Fischs im dunklen Wasser.',
    },
    topics: ['biology', 'science'],
    body: {
      ru: ['Вибриссы тюленя ловят гидродинамический след рыбы — он сохраняется в воде секундами, и тюлень идёт по нему даже в полной темноте.'],
      en: ['A seal’s vibrissae detect the hydrodynamic wake of a fish — it lingers in the water for seconds, and the seal follows it even in total darkness.'],
      de: ['Die Vibrissen einer Robbe erfassen die hydrodynamische Spur eines Fischs — sie bleibt Sekunden im Wasser, und die Robbe folgt ihr selbst in völliger Dunkelheit.'],
    },
  },
  {
    type: 'news',
    slug: 'baltic-center-released-pups',
    title: {
      ru: 'Центр на Балтике выпустил пять тюленят',
      en: 'A Baltic centre released five seal pups',
      de: 'Ein Ostsee-Zentrum hat fünf Heuler ausgewildert',
    },
    excerpt: {
      ru: 'После реабилитации малышей вернули в море.',
      en: 'After rehab, the pups were returned to the sea.',
      de: 'Nach der Reha kamen die Jungtiere zurück ins Meer.',
    },
    topics: ['rescue', 'conservation'],
    body: {
      ru: ['Пятерых тюленят, набравших вес после реабилитации, выпустили обратно в Балтийское море.'],
      en: ['Five seal pups, having gained weight in rehab, were released back into the Baltic Sea.'],
      de: ['Fünf Heuler, die in der Reha an Gewicht zugelegt hatten, wurden zurück in die Ostsee entlassen.'],
    },
  },
  {
    type: 'news',
    slug: 'new-rookery-spotted',
    title: {
      ru: 'Новое лежбище заметили волонтёры',
      en: 'Volunteers spotted a new rookery',
      de: 'Freiwillige haben eine neue Liegestelle entdeckt',
    },
    excerpt: {
      ru: 'Просят не подходить близко в сезон линьки.',
      en: 'They ask people to keep away during moulting season.',
      de: 'Sie bitten darum, in der Fellwechselzeit Abstand zu halten.',
    },
    topics: ['conservation'],
    body: {
      ru: ['Волонтёры зафиксировали новое лежбище и просят держаться поодаль — особенно в сезон линьки, когда тюлени особенно уязвимы.'],
      en: ['Volunteers recorded a new rookery and ask people to keep their distance — especially during moulting season, when seals are most vulnerable.'],
      de: ['Freiwillige haben eine neue Liegestelle dokumentiert und bitten um Abstand — besonders in der Fellwechselzeit, wenn Robben besonders empfindlich sind.'],
    },
  },
  {
    type: 'meme',
    slug: 'meme-blep',
    title: {
      ru: 'Когда показал язык и не жалеешь',
      en: 'When you blep and regret nothing',
      de: 'Wenn du die Zunge rausstreckst und nichts bereust',
    },
    topics: ['humor'],
  },
  {
    type: 'meme',
    slug: 'meme-monday-seal',
    title: { ru: 'Я в понедельник', en: 'Me on a Monday', de: 'Ich am Montag' },
    topics: ['humor'],
  },
  {
    type: 'meme',
    slug: 'meme-banana-pose',
    title: {
      ru: 'Поза банан — это лук, а не лень',
      en: 'The banana pose is a look, not laziness',
      de: 'Die Bananen-Pose ist ein Statement, keine Faulheit',
    },
    topics: ['humor'],
  },
  {
    type: 'page',
    slug: 'about',
    title: { ru: 'О проекте', en: 'About', de: 'Über das Projekt' },
    excerpt: { ru: 'Что такое Тюлень.Инфо.', en: 'What SeaLife.Info is.', de: 'Was Robben.Info ist.' },
    body: {
      ru: ['Тюлень.Инфо — медиа-хаб о тюленях: факты, новости, мемы и квизы. Серьёзная часть — про спасение — живёт на соседнем сайте.'],
      en: ['SeaLife.Info is a media hub about seals: facts, news, memes and quizzes. The serious part — about rescue — lives on the sister site.'],
      de: ['Robben.Info ist ein Medien-Hub über Robben: Fakten, News, Memes und Quizze. Der ernste Teil — über die Rettung — lebt auf der Schwester-Website.'],
    },
  },
]

export const gamesSeed: GameSeed[] = [
  {
    slug: 'seal-the-hunter',
    title: { ru: 'Тюль-Охотник', en: 'Seal The Hunter', de: 'Robbe der Jäger' },
    excerpt: {
      ru: 'Лови рыбу тюленем за 60 секунд.',
      en: 'Hunt fish as a seal in 60 seconds.',
      de: 'Fang als Robbe in 60 Sekunden Fische.',
    },
    how: {
      ru: 'Управление: тяни/веди указателем или стрелками — тюлень плывёт за курсором. Цель: поймать как можно больше рыбы за 60 секунд. Кнопки «Старт», «Пауза» и звук — на панели игры.',
      en: 'Controls: drag/point or use arrow keys — the seal follows the cursor. Goal: catch as many fish as you can in 60 seconds. Start, Pause and sound buttons are in the game toolbar.',
      de: 'Steuerung: ziehen/zeigen oder Pfeiltasten — die Robbe folgt dem Cursor. Ziel: in 60 Sekunden so viele Fische wie möglich fangen. Start, Pause und Ton sind in der Spielleiste.',
    },
    embed: '/games/seal-hunt-v1/index.html',
    showCover: false,
    order: 0,
  },
]

export const speciesSeed: SpeciesSeed[] = [
  {
    slug: 'baltic-ringed-seal',
    name: { ru: 'Балтийская кольчатая нерпа', en: 'Baltic ringed seal', de: 'Ostsee-Ringelrobbe' },
    latin: 'Pusa hispida botnica',
    conservationStatus: 'VU',
    region: { ru: 'Балтийское море', en: 'Baltic Sea', de: 'Ostsee' },
    size: { ru: '≈ 1.3 м', en: '≈ 1.3 m', de: '≈ 1,3 m' },
    excerpt: {
      ru: 'Маленькая нерпа с «кольцами» на шкуре.',
      en: 'A small seal with “rings” on its coat.',
      de: 'Eine kleine Robbe mit „Ringen“ im Fell.',
    },
    facts: [
      { ru: 'Делает снежные норы для детёнышей.', en: 'Builds snow lairs for its pups.', de: 'Baut Schneehöhlen für ihre Jungen.' },
      { ru: 'Под угрозой из-за таяния льда.', en: 'Threatened by shrinking ice.', de: 'Bedroht durch schwindendes Eis.' },
    ],
    body: {
      ru: ['Кольчатая нерпа Балтики зависит от льда: на нём она рожает и выкармливает детёнышей в снежных норах.'],
      en: ['The Baltic ringed seal depends on ice: it gives birth and nurses its pups in snow lairs built on it.'],
      de: ['Die Ostsee-Ringelrobbe ist auf Eis angewiesen: Darauf bringt sie ihre Jungen zur Welt und säugt sie in Schneehöhlen.'],
    },
  },
  {
    slug: 'grey-seal',
    name: { ru: 'Серый тюлень', en: 'Grey seal', de: 'Kegelrobbe' },
    latin: 'Halichoerus grypus',
    conservationStatus: 'LC',
    region: { ru: 'Северная Атлантика, Балтика', en: 'North Atlantic, Baltic', de: 'Nordatlantik, Ostsee' },
    size: { ru: '≈ 2 м', en: '≈ 2 m', de: '≈ 2 m' },
    excerpt: {
      ru: '«Лошадиная морда» — буквально из латыни.',
      en: 'The “hook-nosed sea pig”, literally from Latin.',
      de: '„Hakennasiges Meerschwein“ — wörtlich aus dem Lateinischen.',
    },
    facts: [
      {
        ru: 'Самцы заметно крупнее самок.',
        en: 'Males are noticeably larger than females.',
        de: 'Männchen sind deutlich größer als Weibchen.',
      },
    ],
    body: {
      ru: ['Серый тюлень — один из крупнейших хищников Балтики; узнаётся по вытянутой «лошадиной» морде.'],
      en: ['The grey seal is one of the Baltic’s largest predators, recognised by its long “horse-like” muzzle.'],
      de: ['Die Kegelrobbe ist einer der größten Räuber der Ostsee; erkennbar an ihrer langen „pferdeartigen“ Schnauze.'],
    },
  },
  {
    slug: 'harbour-seal',
    name: { ru: 'Обыкновенный тюлень', en: 'Harbour seal', de: 'Seehund' },
    latin: 'Phoca vitulina',
    conservationStatus: 'LC',
    region: { ru: 'Побережья Северного полушария', en: 'Northern-hemisphere coasts', de: 'Küsten der Nordhalbkugel' },
    size: { ru: '≈ 1.7 м', en: '≈ 1.7 m', de: '≈ 1,7 m' },
    excerpt: {
      ru: 'Тот самый «улыбающийся» тюлень с пятнами.',
      en: 'The classic spotted, “smiling” seal.',
      de: 'Der klassische gefleckte, „lächelnde“ Seehund.',
    },
    facts: [
      {
        ru: 'Детёныши плавают почти сразу после рождения.',
        en: 'Pups can swim almost immediately after birth.',
        de: 'Jungtiere schwimmen fast sofort nach der Geburt.',
      },
    ],
    body: {
      ru: ['Обыкновенный тюлень держится у берегов и устьев рек; именно его чаще всего находят люди на пляжах.'],
      en: ['The harbour seal stays near coasts and river mouths; it is the one people most often find on beaches.'],
      de: ['Der Seehund hält sich nahe Küsten und Flussmündungen auf; ihn finden Menschen am häufigsten an Stränden.'],
    },
  },
]
