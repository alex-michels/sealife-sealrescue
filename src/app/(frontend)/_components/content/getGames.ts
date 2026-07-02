import { getPayload } from 'payload'
import config from '@payload-config'
import type { Game, Media } from '@/payload-types'
import type { Locale } from '@/i18n/config'

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
    where: { _status: { equals: 'published' } },
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
    where: { slug: { equals: slug }, _status: { equals: 'published' } },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}
