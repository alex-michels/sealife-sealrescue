import { getPayload } from 'payload'
import config from '@payload-config'
import type { Game, Media } from '@/payload-types'
import type { Locale } from '@/i18n/config'
import { translatedWhere, localesWithContent } from '@/i18n/translated'

/**
 * Обложка КАРТОЧКИ игры: загруженная картинка, если она есть И не скрыта тумблером
 * showCardCover (выкл = «показывай плейсхолдер, картинку не удаляй»). Чистая функция —
 * закреплена unit-тестом.
 */
export function cardCover(game: Pick<Game, 'coverImage' | 'showCardCover'>): Media | null {
  if (game.showCardCover === false) return null
  return game.coverImage && typeof game.coverImage === 'object' ? game.coverImage : null
}

/** Все опубликованные мини-игры в активной локали, в заданном порядке (order ↑). */
export async function findAllGames(locale: Locale): Promise<Game[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'games',
    locale,
    fallbackLocale: false, // CR-01
    where: { and: [{ _status: { equals: 'published' } }, translatedWhere('title')] },
    sort: 'order',
    depth: 1,
    pagination: false,
  })
  return docs
}

/** Одна опубликованная игра по slug (или null). */
export async function findGameBySlug(locale: Locale, slug: string): Promise<Game | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'games',
    locale,
    fallbackLocale: false, // CR-01
    where: {
      and: [{ slug: { equals: slug }, _status: { equals: 'published' } }, translatedWhere('title')],
    },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

/** В каких контент-локалях игра реально существует — для честного hreflang (CR-01). */
export async function gameLocales(slug: string): Promise<Locale[]> {
  const payload = await getPayload({ config })
  const map = await localesWithContent(payload, 'games', {
    slug: { equals: slug },
    _status: { equals: 'published' },
  })
  return [...(map.get(slug) ?? [])]
}
