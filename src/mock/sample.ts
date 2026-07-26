import type { Locale } from '@/i18n/config'
import type { CenterStatus } from '@/app/(frontend)/_components/ui/StatusDot'

/**
 * Sample-данные для design-mock (M0-T19). НЕ настоящие записи — только проверка
 * визуальной системы, навигации, состояний и responsive. Никаких provider-URL и
 * внешних картинок: «медиа» рисуется PlaceholderMedia (инлайновый SVG).
 *
 * Имена/телефоны/города центров НЕ переводятся (CLAUDE.md/COMPLIANCE §3) — локализуем
 * только описания. Все даты — ISO; форматирование на месте.
 */
export type L = Record<Locale, string>

export interface SampleDoc {
  slug: string
  title: L
  excerpt: L
  date: string
  readMin: number
  aiAssisted: boolean
  body: L[]
}

export interface SampleMeme {
  slug: string
  caption: L
  seed: number
}

export interface SampleQuiz {
  slug: string
  title: L
  excerpt: L
  questions: number
  sample: { q: L; options: L[] }
}

export interface SampleSpecies {
  slug: string
  name: L
  latin: string
  region: L
  size: string
  excerpt: L
  facts: L[]
}

export interface SampleCenter {
  slug: string
  name: string
  city: string
  country: string
  status: CenterStatus
  phone: string
  website: string
  agentCheckedAt: string
  humanReviewedAt?: string
  summary: L
}

// design-mock плейсхолдер. Контент-локали проекта — RU/EN; третий аргумент (DE) больше
// не принимается, лишние аргументы у существующих вызовов игнорируются TypeScript'ом.
const lorem = (ru: string, en: string): L => ({ ru, en })

export const sampleArticles: SampleDoc[] = [
  {
    slug: 'sample-article',
    title: lorem(
      'Почему тюлени плачут (спойлер: не от грусти)',
      'Why seals “cry” (spoiler: not from sadness)',
    ),
    excerpt: lorem(
      'У тюленей нет слёзных протоков, как у нас. Разбираем, зачем им «мокрые глаза».',
      'Seals lack tear ducts like ours. We unpack what those “wet eyes” are really for.',
    ),
    date: '2026-06-10',
    readMin: 5,
    aiAssisted: true,
    body: [
      lorem(
        'Это образец статьи для дизайн-мока. Настоящий текст появится в M1.',
        'This is a sample article for the design mock. Real text arrives in M1.',
      ),
      lorem(
        'Слёзные железы увлажняют и защищают глаза в солёной воде — без носослёзного канала жидкость просто стекает.',
        'Tear glands keep the eyes moist and protected in salt water — without a nasolacrimal duct the fluid simply runs off.',
      ),
    ],
  },
  {
    slug: 'how-seals-sleep',
    title: lorem('Как тюлени спят в воде', 'How seals sleep in the water'),
    excerpt: lorem(
      'Полушарный сон и «бутылкование» столбиком.',
      'Hemispheric sleep and vertical “bottling”.',
    ),
    date: '2026-05-28',
    readMin: 4,
    aiAssisted: false,
    body: [lorem('Образец текста.', 'Sample body text.')],
  },
  {
    slug: 'seal-whiskers',
    title: lorem('Усы как сенсоры: вибриссы тюленя', 'Whiskers as sensors: a seal’s vibrissae'),
    excerpt: lorem('Чувствуют след рыбы в тёмной воде.', 'They track a fish’s wake in dark water.'),
    date: '2026-05-15',
    readMin: 6,
    aiAssisted: true,
    body: [lorem('Образец текста.', 'Sample body text.')],
  },
]

export const sampleNews: SampleDoc[] = [
  {
    slug: 'sample-news',
    title: lorem(
      'Центр на Балтике выпустил пять тюленят',
      'A Baltic center released five seal pups',
    ),
    excerpt: lorem(
      'После реабилитации малышей вернули в море.',
      'After rehab, the pups were returned to the sea.',
    ),
    date: '2026-06-18',
    readMin: 2,
    aiAssisted: false,
    body: [lorem('Образец новости для мока.', 'Sample news item for the mock.')],
  },
  {
    slug: 'new-rookery-spotted',
    title: lorem('Новое лежбище заметили волонтёры', 'Volunteers spotted a new rookery'),
    excerpt: lorem(
      'Просят не подходить близко в сезон линьки.',
      'They ask people to keep away during moulting season.',
    ),
    date: '2026-06-02',
    readMin: 3,
    aiAssisted: true,
    body: [lorem('Образец новости.', 'Sample news body.')],
  },
]

export const sampleMemes: SampleMeme[] = [
  {
    slug: 'blep',
    caption: lorem('Когда показал язык и не жалеешь', 'When you blep and regret nothing'),
    seed: 1,
  },
  { slug: 'monday-seal', caption: lorem('Я в понедельник', 'Me on a Monday'), seed: 2 },
  {
    slug: 'snack-time',
    caption: lorem('Услышал шелест пакета с рыбой', 'Heard the fish bag rustle'),
    seed: 3,
  },
  {
    slug: 'banana-pose',
    caption: lorem('Поза банан — это лук, а не лень', 'The banana pose is a look, not laziness'),
    seed: 4,
  },
]

export const sampleQuizzes: SampleQuiz[] = [
  {
    slug: 'sample-quiz',
    title: lorem('Какой ты тюлень?', 'Which seal are you?'),
    excerpt: lorem('Шесть вопросов — один диагноз.', 'Six questions, one diagnosis.'),
    questions: 6,
    sample: {
      q: lorem('Идеальный день — это…', 'The perfect day is…'),
      options: [
        lorem('Лежать на гальке', 'Lying on the pebbles'),
        lorem('Нырять за рыбой', 'Diving for fish'),
        lorem('Орать на чаек', 'Yelling at gulls'),
      ],
    },
  },
  {
    slug: 'true-or-false-seals',
    title: lorem('Миф или правда?', 'Myth or fact?'),
    excerpt: lorem('Развенчиваем тюленьи легенды.', 'Busting seal legends.'),
    questions: 8,
    sample: {
      q: lorem(
        'Тюленю нужно помочь вернуться в воду.',
        'A seal needs help getting back to the water.',
      ),
      options: [lorem('Правда', 'Fact'), lorem('Миф', 'Myth')],
    },
  },
]

export const sampleSpecies: SampleSpecies[] = [
  {
    slug: 'sample-species',
    name: lorem('Балтийская кольчатая нерпа', 'Baltic ringed seal'),
    latin: 'Pusa hispida botnica',
    region: lorem('Балтийское море', 'Baltic Sea'),
    size: '≈ 1.3 м',
    excerpt: lorem(
      'Маленькая нерпа с «кольцами» на шкуре.',
      'A small seal with “rings” on its coat.',
    ),
    facts: [
      lorem('Делает снежные норы для детёнышей.', 'Builds snow lairs for its pups.'),
      lorem('Под угрозой из-за таяния льда.', 'Threatened by shrinking ice.'),
    ],
  },
  {
    slug: 'grey-seal',
    name: lorem('Серый тюлень', 'Grey seal'),
    latin: 'Halichoerus grypus',
    region: lorem('Северная Атлантика, Балтика', 'North Atlantic, Baltic'),
    size: '≈ 2 м',
    excerpt: lorem(
      '«Лошадиная морда» — буквально из латыни.',
      'The “hook-nosed sea pig”, literally from Latin.',
    ),
    facts: [lorem('Самцы заметно крупнее самок.', 'Males are noticeably larger than females.')],
  },
  {
    slug: 'harbour-seal',
    name: lorem('Обыкновенный тюлень', 'Harbour seal'),
    latin: 'Phoca vitulina',
    region: lorem('Побережья Северного полушария', 'Northern-hemisphere coasts'),
    size: '≈ 1.7 м',
    excerpt: lorem(
      'Тот самый «улыбающийся» тюлень с пятнами.',
      'The classic spotted, “smiling” seal.',
    ),
    facts: [lorem('Детёныши плавают почти сразу.', 'Pups can swim almost immediately.')],
  },
]

/**
 * ⚠️ ВСЕ центры здесь ВЫДУМАНЫ, и это обязательное свойство, а не небрежность.
 *
 * Раньше первой карточкой стояла НАСТОЯЩАЯ немецкая станция — с её реальным названием, рабочим
 * телефоном и сайтом — да ещё и под «штампом проверки» с выдуманными датами сверки агентом и
 * человеком. Это нарушение инварианта №7 (`CLAUDE.md`) с последствиями в физическом мире: карточка
 * стоит на аварийном пути, а в аварии фальшивый и настоящий контакт визуально неразличимы. Плюс
 * организация не давала согласия изображать её проверенной нами (аудит 2026-07-26, BIO-07).
 *
 * Правила для этого файла: только вымышленные названия с пометкой «sample», только домен
 * example.org, только заведомо нерабочие номера. Настоящие центры появятся из Payload в M2-T02.
 */
export const sampleCenters: SampleCenter[] = [
  {
    slug: 'sample-center',
    name: 'North Sea Seal Station (sample)',
    city: 'Samplehaven',
    country: 'DE',
    status: 'active',
    phone: '+49 30 000000',
    website: 'https://example.org/north-sea-seal-station',
    agentCheckedAt: '2026-06-12',
    humanReviewedAt: '2026-06-14',
    summary: lorem(
      'Образец карточки центра. Приём и реабилитация тюленей Северного моря.',
      'Sample center card. Intake and rehabilitation of North Sea seals.',
    ),
  },
  {
    slug: 'a-rocha-baltic',
    name: 'Baltic Seal Rehab (sample)',
    city: 'Kaliningrad',
    country: 'RU',
    status: 'needs_check',
    phone: '+7 4012 000000',
    website: 'https://example.org/baltic-seal',
    agentCheckedAt: '2026-06-05',
    summary: lorem(
      'Образец: данные требуют проверки человеком.',
      'Sample: data awaits human verification.',
    ),
  },
  {
    slug: 'north-coast-trust',
    name: 'North Coast Seal Trust (sample)',
    city: 'Aberdeen',
    country: 'GB',
    status: 'active',
    phone: '+44 1224 000000',
    website: 'https://example.org/north-coast',
    agentCheckedAt: '2026-06-11',
    humanReviewedAt: '2026-06-13',
    summary: lorem(
      'Образец активного центра с маршрутом и телефоном.',
      'Sample active center with directions and phone.',
    ),
  },
  {
    slug: 'old-link-center',
    name: 'Harbour Rescue (sample)',
    city: 'Hel',
    country: 'PL',
    status: 'link_broken',
    phone: '+48 58 0000000',
    website: 'https://example.org/harbour-rescue',
    agentCheckedAt: '2026-04-20',
    summary: lorem(
      'Образец: ссылка на сайт центра не открывается.',
      'Sample: the center’s website link is broken.',
    ),
  },
]

export const sampleRescueNews: SampleDoc[] = [
  {
    slug: 'baltic-release',
    title: lorem('График приёма обновлён на лето', 'Intake schedule updated for summer'),
    excerpt: lorem(
      'Несколько центров изменили часы работы.',
      'A few centers changed their opening hours.',
    ),
    date: '2026-06-15',
    readMin: 2,
    aiAssisted: false,
    body: [lorem('Образец новости спасения.', 'Sample rescue news item.')],
  },
]

const bySlug = <T extends { slug: string }>(items: T[], slug: string): T | undefined =>
  items.find((i) => i.slug === slug)

export const findArticle = (slug: string) => bySlug(sampleArticles, slug)
export const findNews = (slug: string) => bySlug(sampleNews, slug)
export const findQuiz = (slug: string) => bySlug(sampleQuizzes, slug)
export const findSpecies = (slug: string) => bySlug(sampleSpecies, slug)
export const findCenter = (slug: string) => bySlug(sampleCenters, slug)
