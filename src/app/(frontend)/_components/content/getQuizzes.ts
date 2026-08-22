import { getPayload } from 'payload'
import config from '@payload-config'
import type { Quiz } from '@/payload-types'
import type { Locale } from '@/i18n/config'
import { translatedWhere, localesWithContent } from '@/i18n/translated'
import { isPreview } from '@/preview/state'
import { PER_PAGE, pageCount } from '@/content/pagination'
import type { Paged } from './getContent'

/**
 * Чтение квизов из Payload (Roadmap **M1-T10**).
 *
 * До этой задачи коллекция `quizzes` была ОСИРОТЕВШЕЙ: поля, локализация, drafts и provenance на
 * месте, `Quiz` есть в `payload-types.ts`, а читателя — ни одного. Редактор мог создать и
 * опубликовать квиз, и на сайте не менялось ничего: раздел рендерился из выдуманных
 * `sampleQuizzes`. Этот файл — недостающий читатель, дальше по образцу `getSpecies`/`getGames`.
 */

/** Опубликованные квизы в активной локали, страницами (CR-07). */
export async function findAllQuizzes(locale: Locale, page = 1): Promise<Paged<Quiz>> {
  const payload = await getPayload({ config })
  const res = await payload.find({
    collection: 'quizzes',
    locale,
    // CR-01: пара `fallbackLocale: false` + `translatedWhere` обязательна В КАЖДОМ публичном
    // запросе. Гейт не глобальный: `localization.fallback` выключен лишь как дефолт, и без пары
    // непереведённый квиз приехал бы английским текстом под `hreflang="ru"`.
    fallbackLocale: false,
    where: { and: [{ _status: { equals: 'published' } }, translatedWhere('title')] },
    sort: 'title',
    depth: 0, // обложек у квизов нет
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

/** Один опубликованный квиз по slug (или null). В предпросмотре — и черновик (CR-08). */
export async function findQuizBySlug(locale: Locale, slug: string): Promise<Quiz | null> {
  const payload = await getPayload({ config })
  const preview = await isPreview()
  const { docs } = await payload.find({
    collection: 'quizzes',
    locale,
    fallbackLocale: false,
    draft: preview,
    where: {
      and: [
        { slug: { equals: slug } },
        ...(preview ? [] : [{ _status: { equals: 'published' } }]),
        translatedWhere('title'),
      ],
    },
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
}

/**
 * Полный пул опубликованных квизов для «квиза дня» на главной (M1-T05).
 *
 * ⚠️ Без пагинации: `pickOfDay` берёт `день % длина_пула`, и пул из `limit: PER_PAGE` превратил бы
 * «квиз дня» в «квиз первой страницы» — та же ошибка, которую CR-07 поймал на «факте дня».
 * Запрос лёгкий за счёт `select`: ни вопросов, ни provenance.
 */
export async function quizPool(locale: Locale): Promise<Array<Pick<Quiz, 'slug' | 'title'>>> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'quizzes',
    locale,
    fallbackLocale: false,
    where: { and: [{ _status: { equals: 'published' } }, translatedWhere('title')] },
    sort: 'slug', // стабильный порядок: от него зависит, какой квиз «сегодняшний»
    depth: 0,
    pagination: false,
    select: { slug: true, title: true },
  })
  return docs as Array<Pick<Quiz, 'slug' | 'title'>>
}

/** В каких контент-локалях квиз реально существует — для честного hreflang (CR-01). */
export async function quizLocales(slug: string): Promise<Locale[]> {
  const payload = await getPayload({ config })
  const map = await localesWithContent(payload, 'quizzes', {
    slug: { equals: slug },
    _status: { equals: 'published' },
  })
  return [...(map.get(slug) ?? [])]
}
