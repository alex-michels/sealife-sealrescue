import { getPayload } from 'payload'
import config from '@payload-config'
import type { Game } from '@/payload-types'
import type { Locale } from '@/i18n/config'

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
