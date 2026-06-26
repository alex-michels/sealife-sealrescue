import { getPayload } from 'payload'
import config from '@payload-config'
import type { Species } from '@/payload-types'
import type { Locale } from '@/i18n/config'

/** Все опубликованные виды в активной локали, по алфавиту (M1-T03). */
export async function findAllSpecies(locale: Locale): Promise<Species[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'species',
    locale,
    where: { _status: { equals: 'published' } },
    sort: 'name',
    depth: 1,
    pagination: false,
  })
  return docs
}

/** Один опубликованный вид по slug (или null). */
export async function findSpeciesBySlug(locale: Locale, slug: string): Promise<Species | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'species',
    locale,
    where: { slug: { equals: slug }, _status: { equals: 'published' } },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}
