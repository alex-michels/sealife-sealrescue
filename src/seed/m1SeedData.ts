import type { TopicSlug } from '../content/topics'

/**
 * Демо-наполнение для M1-T01–T04: реальные записи в Payload (Content + Species),
 * RU/EN, чтобы шаблоны/каталог/фильтры/Тюленепедия рендерились из БД, а не из mock.
 * Это НЕ финальный контент (авторский контент — M1-T06/07); идемпотентный посев.
 *
 * ## Провенанс (BIO-16)
 * Весь текст здесь написан AI и человеком не вычитан, поэтому:
 *  - записи сеются ЧЕРНОВИКАМИ (`_status: 'draft'`, см. `./lib.ts`) — публиковать
 *    непроверенную биологию нельзя (инвариант №7);
 *  - флаги провенанса выставляются централизованно в `./lib.ts`: ru — `aiAssisted`
 *    (оригинал черновика), en — `aiTranslated` (машинный перевод). Отдельного поля в записи
 *    нет: правило одинаково для всех строк сида, а исключения появятся вместе с ревью M1-T08.
 * `sources` не заполняем: коллекция пуста, а выдуманная ссылка хуже отсутствующей.
 *
 * ## Предметная точность (трек BIO)
 * Тексты правились по аудиту 2026-07-26. Ключевые правила, которые легко сломать обратно:
 *  - однополушарный сон — признак УШАСТЫХ (Otariidae); фоциды спят двуполушарно (BIO-08);
 *  - «rookery»/«лежбище» — про ушастых и птиц; у настоящих тюленей это haul-out / «залёжка» (BIO-12);
 *  - Halichoerus grypus — греческие корни, не латынь (BIO-11).
 */

type L = { ru: string; en: string }
type Paras = { ru: string[]; en: string[] }

export interface ContentSeed {
  type: 'article' | 'news' | 'meme' | 'page'
  slug: string
  title: L
  excerpt?: L
  topics?: TopicSlug[]
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

/**
 * Контекст охранного статуса (BIO-09/BIO-13). Без него «VU» неотличим от «VU у подвида»:
 * балтийская нерпа уязвима как ПОДВИД, тогда как вид Pusa hispida в целом — LC.
 */
export interface ConservationAssessmentSeed {
  scope: 'species' | 'subspecies' | 'subpopulation' | 'regional'
  assessedEntity?: string
  assessmentYear?: number
  sourceUrl?: string
  listingSystem?: 'iucn' | 'helcom' | 'national' | 'esa'
}

export interface SpeciesSeed {
  slug: string
  name: L
  latin: string
  conservationStatus?: 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'DD'
  conservationAssessment?: ConservationAssessmentSeed
  region?: L
  size?: L
  excerpt?: L
  facts: L[]
  body?: Paras
}

export const contentSeed: ContentSeed[] = [
  {
    type: 'article',
    slug: 'why-seals-cry',
    title: {
      ru: 'Почему тюлени «плачут» (спойлер: не от грусти)',
      en: 'Why seals “cry” (spoiler: not from sadness)',    },
    excerpt: {
      ru: 'У тюленей нет слёзных протоков, как у нас. Разбираем, зачем им «мокрые глаза».',
      en: 'Seals lack tear ducts like ours. We unpack what those “wet eyes” are really for.',    },
    topics: ['biology', 'science'],
    body: {
      ru: [
        'Слёзные железы увлажняют и защищают глаза в солёной воде. Без носослёзного канала жидкость просто стекает по морде — отсюда «слёзы».',
        'Так что мокрые глаза тюленя — это не эмоции, а исправно работающая защита от соли и песка.',
      ],
      en: [
        'Tear glands keep the eyes moist and protected in salt water. Without a nasolacrimal duct, the fluid simply runs down the face — hence the “tears”.',
        'So a seal’s wet eyes are not emotion but a perfectly working defence against salt and sand.',
      ],    },
  },
  // BIO-08: до правки статья приписывала настоящим тюленям однополушарный сон — ошибка
  // уровня семейства (это признак ушастых). Фоциды спят обоими полушариями, зато на
  // задержке дыхания: на дне, в дрейфовом погружении и «столбиком» у поверхности.
  {
    type: 'article',
    slug: 'how-seals-sleep',
    title: {
      ru: 'Как тюлени спят в воде',
      en: 'How seals sleep in the water',    },
    excerpt: {
      ru: 'Оба полушария спят сразу — на дне, в дрейфовом погружении и «столбиком» у поверхности.',
      en: 'Both hemispheres sleep at once — on the bottom, mid drift dive, and bottling at the surface.',    },
    topics: ['biology', 'behavior'],
    body: {
      ru: [
        'Спать одним полушарием умеют ушастые тюлени, а не настоящие. Морской котик дремлет в воде на боку, неспешно подгребая одним ластом, — половина мозга бодрствует и держит его на плаву. Наши герои другие: нерпа, серый и обыкновенный тюлень — фоциды, и спят они обоими полушариями сразу, как мы. Лёгкую асимметрию полушарий у них находят, но бодрствующей половины мозга — нет.',
        'Значит, спать приходится на задержке дыхания. Обыкновенный тюлень укладывается на дно мелководья и всплывает вдохнуть раз в несколько минут, толком не просыпаясь: дыхание у спящего тюленя идёт сериями с длинными паузами, и это норма, а не удушье.',
        'В открытом море работает дрейфовое погружение: тюлень перестаёт грести и медленно уходит вниз, проспав самую глубокую часть погружения. У северных морских слонов на такой глубине записали и медленный, и быстрый сон — в быстром животное теряет мышечный тонус и опускается штопором.',
        'А у самой поверхности есть третья поза: тело висит вертикально, над водой торчит только нос. По-английски это bottling, по-русски точнее сказать «зависание столбиком». Со стороны похоже на поплавок — и это сон, а не беда.',
      ],
      en: [
        'Sleeping on one hemisphere is an eared-seal trick, not a true-seal one. A fur seal dozes on its side in the water, paddling gently with one flipper — half the brain stays awake and keeps it afloat. Our regulars are different: ringed, grey and harbour seals are phocids, and they sleep with both hemispheres at once, the way we do. A mild asymmetry between the hemispheres does show up in them, but never a waking half.',
        'Which means sleeping on a held breath. A harbour seal settles on a shallow bottom and floats up for air every few minutes without properly waking: a sleeping seal breathes in bouts separated by long pauses, and that is normal, not suffocation.',
        'Out at sea the trick is the drift dive: the seal stops swimming and sinks slowly, sleeping through the deepest part of the descent. In northern elephant seals both slow-wave and REM sleep have been recorded down there — in REM the animal loses muscle tone and spirals downwards.',
        'And right at the surface there is a third posture: the body hangs vertically with only the nose above water. English calls it bottling. It looks like a float bobbing there — and it is sleep, not trouble.',
      ],    },
  },
  {
    type: 'article',
    slug: 'seal-whiskers',
    title: {
      ru: 'Усы как сенсоры: вибриссы тюленя',
      en: 'Whiskers as sensors: a seal’s vibrissae',    },
    excerpt: {
      ru: 'Чувствуют след рыбы в тёмной воде.',
      en: 'They track a fish’s wake in dark water.',    },
    topics: ['biology', 'science'],
    body: {
      ru: [
        'Вибриссы тюленя ловят гидродинамический след рыбы — он сохраняется в воде секундами, и тюлень идёт по нему даже в полной темноте.',
      ],
      en: [
        'A seal’s vibrissae detect the hydrodynamic wake of a fish — it lingers in the water for seconds, and the seal follows it even in total darkness.',
      ],    },
  },
  {
    type: 'news',
    slug: 'baltic-center-released-pups',
    title: {
      ru: 'Центр на Балтике выпустил пять тюленят',
      en: 'A Baltic centre released five seal pups',    },
    excerpt: {
      ru: 'После реабилитации малышей вернули в море.',
      en: 'After rehab, the pups were returned to the sea.',    },
    topics: ['rescue', 'conservation'],
    body: {
      ru: [
        'Пятерых тюленят, набравших вес после реабилитации, выпустили обратно в Балтийское море.',
      ],
      en: [
        'Five seal pups, having gained weight in rehab, were released back into the Baltic Sea.',
      ],    },
  },
  // BIO-12: было «лежбище» / «rookery». Rookery в английском — про ушастых тюленей и птичьи
  // колонии; у настоящих тюленей это haul-out, по-русски «залёжка». Slug оставлен прежним
  // сознательно: сид — upsert по slug, и переименование бросило бы старую (опубликованную!)
  // запись с неверным термином сиротой в уже посеянных БД.
  {
    type: 'news',
    slug: 'new-rookery-spotted',
    title: {
      ru: 'Новую залёжку заметили волонтёры',
      en: 'Volunteers spotted a new haul-out',    },
    excerpt: {
      ru: 'Просят не подходить близко в сезон линьки.',
      en: 'They ask people to keep away during moulting season.',    },
    topics: ['conservation'],
    body: {
      ru: [
        'Волонтёры зафиксировали новую залёжку — место, куда тюлени выходят из воды отдыхать, — и просят держаться поодаль. Особенно в линьку: согнанное с камней животное теряет тепло и часы, которые нужны ему на смену шерсти.',
      ],
      en: [
        'Volunteers recorded a new haul-out — a spot where seals come out of the water to rest — and ask people to keep their distance. Especially during the moult: a seal driven off the rocks loses the warmth and the hours it needs to grow a new coat.',
      ],    },
  },
  {
    type: 'meme',
    slug: 'meme-blep',
    title: {
      ru: 'Когда показал язык и не жалеешь',
      en: 'When you blep and regret nothing',    },
    topics: ['humor'],
  },
  {
    type: 'meme',
    slug: 'meme-monday-seal',
    title: { ru: 'Я в понедельник', en: 'Me on a Monday',},
    topics: ['humor'],
  },
  {
    type: 'meme',
    slug: 'meme-banana-pose',
    title: {
      ru: 'Поза банан — это лук, а не лень',
      en: 'The banana pose is a look, not laziness',    },
    topics: ['humor'],
  },
  {
    type: 'page',
    slug: 'about',
    title: { ru: 'О проекте', en: 'About',},
    excerpt: {
      ru: 'Что такое Тюлень.Инфо.',
      en: 'What SeaLife.Info is.',    },
    body: {
      ru: [
        'Тюлень.Инфо — медиа-хаб о тюленях: факты, новости, мемы и квизы. Серьёзная часть — про спасение — живёт на соседнем сайте.',
      ],
      en: [
        'SeaLife.Info is a media hub about seals: facts, news, memes and quizzes. The serious part — about rescue — lives on the sister site.',
      ],    },
  },
]

export const gamesSeed: GameSeed[] = [
  {
    slug: 'seal-the-hunter',
    title: { ru: 'Тюль-Охотник', en: 'Seal The Hunter',},
    excerpt: {
      ru: 'Лови рыбу тюленем за 60 секунд.',
      en: 'Hunt fish as a seal in 60 seconds.',    },
    how: {
      ru: 'Управление: тяни/веди указателем или стрелками — тюлень плывёт за курсором. Цель: поймать как можно больше рыбы за 60 секунд. Кнопки «Старт», «Пауза» и звук — на панели игры.',
      en: 'Controls: drag/point or use arrow keys — the seal follows the cursor. Goal: catch as many fish as you can in 60 seconds. Start, Pause and sound buttons are in the game toolbar.',    },
    embed: '/games/seal-hunt-v1/index.html',
    showCover: false,
    order: 0,
  },
  {
    slug: 'seal-run',
    title: {
      ru: 'Seal Run — заплыв тюленя',
      en: 'Seal Run',    },
    excerpt: {
      ru: 'Раннер: проплыви 900 метров прибрежной воды, уворачиваясь от хищников, сетей и камней.',
      en: 'A runner: swim 900 metres of coastal water, dodging predators, nets and rocks.',    },
    how: {
      ru: 'Веди тюленя по глубине: палец или мышь задают цель, ↑/↓ или W/S — с клавиатуры. Рыба даёт очки и дыхание (метр падает сам — ешь, чтобы плыть). Хищники отнимают жизнь, сети и пластик замедляют и душат, камни отбрасывают. Трасса недели одна на всех — дистанция решает.',
      en: 'Steer the seal by depth: finger or mouse sets the target, ↑/↓ or W/S on the keyboard. Fish give points and breath (the meter drains on its own — eat to keep swimming). Predators cost a life, nets and plastic slow and choke you, rocks knock you back. One weekly course for everyone — distance decides.',    },
    embed: '/games/seal-run-v1/index.html',
    showCover: false,
    order: 1,
  },
]

/**
 * Ссылки на оценки IUCN даны поиском по научному имени, а не прямым `/species/<id>/<id>`:
 * числовые id таксона и оценки наизусть не воспроизводятся, а выдуманная ссылка — это
 * фальшивая цитата (инвариант №7). Поиск ведёт на ту же страницу Red List и проверяем.
 */
const redListSearch = (latin: string) =>
  `https://www.iucnredlist.org/search?query=${encodeURIComponent(latin)}&searchType=species`

export const speciesSeed: SpeciesSeed[] = [
  // BIO-09: VU здесь — оценка ПОДВИДА. Вид Pusa hispida в целом LC (так и написано в
  // глоссарии), поэтому без `conservationAssessment` сайт публиковал два статуса одного
  // животного и выглядел противоречащим сам себе.
  {
    slug: 'baltic-ringed-seal',
    name: { ru: 'Балтийская кольчатая нерпа', en: 'Baltic ringed seal',},
    latin: 'Pusa hispida botnica',
    conservationStatus: 'VU',
    conservationAssessment: {
      scope: 'subspecies',
      assessedEntity: 'Pusa hispida botnica',
      assessmentYear: 2016,
      listingSystem: 'iucn',
      sourceUrl: redListSearch('Pusa hispida botnica'),
    },
    // Ареал сужен: подвид держится в северной и восточной Балтике, а не «в Балтийском море».
    region: {
      ru: 'Ботнический, Финский и Рижский заливы, Архипелаговое море',
      en: 'Gulfs of Bothnia, Finland and Riga; the Archipelago Sea',    },
    size: { ru: '≈ 1.3 м', en: '≈ 1.3 m',},
    excerpt: {
      ru: 'Маленькая нерпа с «кольцами» на шкуре.',
      en: 'A small seal with “rings” on its coat.',    },
    facts: [
      {
        ru: 'Роет детёнышу нору в снежном надуве на льду.',
        en: 'Digs its pup a lair in a snowdrift on the ice.',      },
      {
        ru: 'Мало льда и снега — нора не строится; это главная угроза подвида.',
        en: 'Too little ice and snow and the lair cannot be built — the subspecies’ main threat.',      },
      {
        ru: 'Уязвим (VU) как балтийский подвид; кольчатая нерпа в целом — благополучный вид (LC).',
        en: 'Vulnerable (VU) as the Baltic subspecies; the ringed seal as a species is Least Concern.',      },
    ],
    body: {
      ru: [
        'Кольчатая нерпа Балтики зависит от льда: на нём она рожает и выкармливает детёнышей в снежных норах.',
        'Уязвимой (VU) её признают именно как балтийский подвид — Pusa hispida botnica. Вид Pusa hispida целиком, от Арктики до Байкала, оценён как LC: одно животное, две оценки на разных уровнях.',
      ],
      en: [
        'The Baltic ringed seal depends on ice: it gives birth and nurses its pups in snow lairs built on it.',
        'It is listed Vulnerable as the Baltic subspecies — Pusa hispida botnica. The species Pusa hispida as a whole, from the Arctic to Lake Baikal, is Least Concern: one animal, two assessments at different levels.',
      ],    },
  },
  // BIO-11: этимология была названа латынью, а ru и en глоссы противоречили друг другу.
  // Halichoerus grypus собрано из греческих корней; «тевяк» и «лошадиная морда» —
  // народные прозвища, а не перевод. Размер дан по полу: «≈ 2 м» стояло прямо над фразой
  // «самцы заметно крупнее самок».
  {
    slug: 'grey-seal',
    name: { ru: 'Серый тюлень', en: 'Grey seal',},
    latin: 'Halichoerus grypus',
    conservationStatus: 'LC',
    conservationAssessment: {
      scope: 'species',
      assessedEntity: 'Halichoerus grypus',
      assessmentYear: 2016,
      listingSystem: 'iucn',
      sourceUrl: redListSearch('Halichoerus grypus'),
    },
    region: {
      ru: 'Северная Атлантика, Балтика',
      en: 'North Atlantic, Baltic',    },
    size: {
      ru: 'самки ≈ 1.8–2.0 м, самцы ≈ 2.2–2.6 м',
      en: 'females ≈ 1.8–2.0 m, males ≈ 2.2–2.6 m',    },
    excerpt: {
      ru: '«Морская свинья с крючковатым носом» — буквально с греческого.',
      en: 'The “hook-nosed sea pig” — literally, from the Greek.',    },
    facts: [
      {
        ru: 'Самцы заметно крупнее самок и носят массивную горбоносую морду.',
        en: 'Males are noticeably larger than females and carry a heavy, hook-nosed muzzle.',      },
      {
        ru: 'Прозвища: «тевяк» и «лошадиная морда» — народные, к научному имени отношения не имеют.',
        en: 'Nicknames: Russian “tevyak” and “horse-head” — vernacular, unrelated to the scientific name.',      },
    ],
    body: {
      ru: [
        'Серый тюлень — один из крупнейших хищников Балтики; узнаётся по вытянутой горбоносой морде.',
        'Научное имя Halichoerus grypus собрано из греческих корней: hali- «море», choiros «свинья», grypos «крючконосый» — «морская свинья с крючковатым носом».',
      ],
      en: [
        'The grey seal is one of the Baltic’s largest predators, recognised by its long, hook-nosed muzzle.',
        'The scientific name Halichoerus grypus is built from Greek roots: hali- “sea”, choiros “pig”, grypos “hook-nosed” — the hook-nosed sea pig.',
      ],    },
  },
  {
    slug: 'harbour-seal',
    name: { ru: 'Обыкновенный тюлень', en: 'Harbour seal',},
    latin: 'Phoca vitulina',
    conservationStatus: 'LC',
    conservationAssessment: {
      scope: 'species',
      assessedEntity: 'Phoca vitulina',
      assessmentYear: 2016,
      listingSystem: 'iucn',
      sourceUrl: redListSearch('Phoca vitulina'),
    },
    region: {
      ru: 'Побережья Северного полушария',
      en: 'Northern-hemisphere coasts',    },
    size: { ru: '≈ 1.7 м', en: '≈ 1.7 m',},
    excerpt: {
      ru: 'Тот самый «улыбающийся» тюлень с пятнами.',
      en: 'The classic spotted, “smiling” seal.',    },
    facts: [
      {
        ru: 'Детёныши плавают почти сразу после рождения.',
        en: 'Pups can swim almost immediately after birth.',      },
    ],
    body: {
      ru: [
        'Обыкновенный тюлень держится у берегов и устьев рек; именно его чаще всего находят люди на пляжах.',
      ],
      en: [
        'The harbour seal stays near coasts and river mouths; it is the one people most often find on beaches.',
      ],    },
  },
]
