import { getPayload } from 'payload'
import config from '@payload-config'
import type { Content } from '@/payload-types'
import type { Locale } from '@/i18n/config'
import { isTopicSlug, topicSlugs, type TopicSlug } from '@/content/topics'
import { translatedWhere } from '@/i18n/translated'
import { PER_PAGE, pageCount } from '@/content/pagination'

export type Paged<T> = { docs: T[]; page: number; totalPages: number; totalDocs: number }

/**
 * Опубликованный контент одного типа в активной локали, свежие сверху (M1-T01/T02).
 *
 * **CR-07:** страница читается страницей, а не таблицей целиком. Фильтр по теме ушёл в запрос —
 * раньше он применялся В ПАМЯТИ, после выборки всего; с пагинацией это давало бы полупустые
 * страницы (отфильтровали 12 карточек текущей страницы вместо 12 подходящих из всех).
 */
export async function findContentByType(
  type: Content['type'],
  locale: Locale,
  { page = 1, topic }: { page?: number; topic?: TopicSlug } = {},
): Promise<Paged<Content>> {
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'content',
    locale,
    // CR-01: непереведённый документ не показываем в чужой локали (см. src/i18n/translated.ts).
    fallbackLocale: false,
    where: {
      and: [
        { type: { equals: type }, _status: { equals: 'published' } },
        ...(topic ? [{ topics: { contains: topic } }] : []),
        translatedWhere('title'),
      ],
    },
    // CR-05: сортируем по дате ВЫХОДА, а не по последней правке — иначе исправленная опечатка
    // поднимает старый материал на первое место.
    sort: '-publishedAt',
    depth: 1, // обложки (media.url) для карточек
    limit: PER_PAGE,
    page,
  })
  return {
    docs: res.docs,
    page: res.page ?? 1,
    totalDocs: res.totalDocs,
    totalPages: pageCount(res.totalDocs),
  }
}

/**
 * Темы, реально встречающиеся в разделе, в порядке таксономии (для бара фильтров).
 *
 * ⚠️ Отдельный запрос, а не выжимка из текущей страницы: иначе на второй странице чипы менялись бы,
 * а тема, которой не оказалось в первых двенадцати карточках, просто исчезала бы из фильтра.
 * Запрос лёгкий — `depth: 0` и только поле `topics`.
 */
export async function availableTopics(
  type: Content['type'],
  locale: Locale,
): Promise<TopicSlug[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'content',
    locale,
    fallbackLocale: false,
    where: {
      and: [{ type: { equals: type }, _status: { equals: 'published' } }, translatedWhere('title')],
    },
    depth: 0,
    pagination: false,
    select: { topics: true },
  })

  const present = new Set<string>()
  for (const d of docs) for (const slug of d.topics ?? []) present.add(slug)
  return topicSlugs.filter((slug) => present.has(slug))
}

/** Нормализовать ?topic= из searchParams в валидный slug (или undefined). */
export function parseTopic(raw?: string | string[]): TopicSlug | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v && isTopicSlug(v) ? v : undefined
}

/** Что нужно плитке bento: заголовок, ссылка, обложка (M1-T05). */
export type TeaserDoc = Pick<Content, 'id' | 'slug' | 'title' | 'excerpt' | 'coverImage'>

const TEASER_SELECT = { slug: true, title: true, excerpt: true, coverImage: true } as const

const publishedOfType = (type: Content['type']) => ({
  and: [
    { type: { equals: type }, _status: { equals: 'published' } },
    // CR-01: пара `fallbackLocale: false` + `translatedWhere` обязательна В КАЖДОМ публичном
    // запросе — гейт не глобальный, `localization.fallback` выключен лишь как дефолт.
    translatedWhere('title'),
  ],
})

/**
 * ПОЛНЫЙ пул документов типа для выбора «X дня» (`pickOfDay`) — M1-T05.
 *
 * ⚠️ `pagination: false` здесь обязательно, а не «пока данных мало». `pickOfDay` берёт
 * `день % длина_пула`, поэтому пул из `limit: PER_PAGE` превратил бы «мем дня» в «мем первой
 * страницы» — ровно та ошибка, которую CR-07 уже поймал на «факте дня». Запрос лёгкий за счёт
 * `select`: ни тела, ни provenance, ни localeStatus.
 */
export async function dailyPool(type: Content['type'], locale: Locale): Promise<TeaserDoc[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'content',
    locale,
    fallbackLocale: false,
    where: publishedOfType(type),
    sort: 'slug', // стабильный порядок пула: от него зависит, какой элемент «сегодняшний»
    depth: 1, // обложка карточки
    pagination: false,
    select: TEASER_SELECT,
  })
  return docs as TeaserDoc[]
}

/**
 * Самый свежий документ типа (плитка «последняя новость», M1-T05).
 * Сортировка по `publishedAt` — дате ВЫХОДА, а не последней правки (CR-05): иначе исправленная
 * опечатка делала бы старый материал «последней новостью».
 */
export async function latestOfType(
  type: Content['type'],
  locale: Locale,
): Promise<TeaserDoc | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'content',
    locale,
    fallbackLocale: false,
    where: publishedOfType(type),
    sort: '-publishedAt',
    depth: 1,
    limit: 1,
    select: TEASER_SELECT,
  })
  return (docs[0] as TeaserDoc | undefined) ?? null
}
