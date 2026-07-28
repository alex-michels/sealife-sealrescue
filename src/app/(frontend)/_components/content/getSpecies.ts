import { getPayload } from 'payload'
import config from '@payload-config'
import type { Species } from '@/payload-types'
import type { Locale } from '@/i18n/config'
import { translatedWhere, localesWithContent } from '@/i18n/translated'
import { isPreview } from '@/preview/state'

/** Все опубликованные виды в активной локали, по алфавиту (M1-T03). */
export async function findAllSpecies(locale: Locale): Promise<Species[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'species',
    locale,
    fallbackLocale: false, // CR-01
    where: { and: [{ _status: { equals: 'published' } }, translatedWhere('name')] },
    sort: 'name',
    depth: 1,
    pagination: false,
  })
  return docs
}

/** Один опубликованный вид по slug (или null). В предпросмотре — и черновик (CR-08). */
export async function findSpeciesBySlug(locale: Locale, slug: string): Promise<Species | null> {
  const payload = await getPayload({ config })
  const preview = await isPreview()
  const { docs } = await payload.find({
    collection: 'species',
    locale,
    fallbackLocale: false, // CR-01: непереведённый вид → null → 404, а не исходный язык
    draft: preview,
    where: {
      and: [
        preview
          ? { slug: { equals: slug } }
          : { slug: { equals: slug }, _status: { equals: 'published' } },
        translatedWhere('name'),
      ],
    },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

/** В каких контент-локалях вид реально существует — для честного hreflang (CR-01). */
export async function speciesLocales(slug: string): Promise<Locale[]> {
  const payload = await getPayload({ config })
  const map = await localesWithContent(payload, 'species', {
    slug: { equals: slug },
    _status: { equals: 'published' },
  })
  return [...(map.get(slug) ?? [])]
}
