import { getPayload } from 'payload'
import config from '@payload-config'
import type { Content } from '@/payload-types'
import type { Locale } from '@/i18n/config'
import { isTopicSlug, topicSlugs, type TopicSlug } from '@/content/topics'

/** Опубликованный контент одного типа в активной локали, свежие сверху (M1-T01/T02). */
export async function findContentByType(type: Content['type'], locale: Locale): Promise<Content[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'content',
    locale,
    where: { type: { equals: type }, _status: { equals: 'published' } },
    sort: '-updatedAt',
    depth: 1, // обложки (media.url) для карточек
    pagination: false,
  })
  return docs
}

/** Темы, реально встречающиеся в наборе, в порядке таксономии (для бара фильтров). */
export function availableTopics(docs: Content[]): TopicSlug[] {
  const present = new Set<string>()
  for (const d of docs) for (const slug of d.topics ?? []) present.add(slug)
  return topicSlugs.filter((slug) => present.has(slug))
}

/** Нормализовать ?topic= из searchParams в валидный slug (или undefined). */
export function parseTopic(raw?: string | string[]): TopicSlug | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw
  return v && isTopicSlug(v) ? v : undefined
}

/** Отфильтровать по теме (без темы — весь набор). */
export function filterByTopic(docs: Content[], topic?: TopicSlug): Content[] {
  if (!topic) return docs
  return docs.filter((d) => d.topics?.includes(topic))
}
