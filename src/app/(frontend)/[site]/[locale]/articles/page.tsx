import {
  requireSection,
  sectionMetadata,
  type RouteParams,
  type SearchParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { PageShell } from '@/app/(frontend)/_components/content/PageShell'
import { TopicFilter } from '@/app/(frontend)/_components/content/TopicFilter'
import { ContentList } from '@/app/(frontend)/_components/content/ContentList'
import {
  findContentByType,
  availableTopics,
  filterByTopic,
  parseTopic,
} from '@/app/(frontend)/_components/content/getContent'
import { topicLabel } from '@/content/topics'

const SLUG = 'articles'

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function ArticlesPage({
  params,
  searchParams,
}: {
  params: RouteParams
  searchParams: SearchParams
}) {
  const { locale, section } = await requireSection(params, SLUG)
  const topic = parseTopic((await searchParams).topic)
  const docs = await findContentByType('article', locale)
  const items = filterByTopic(docs, topic).map((d) => ({
    href: `/${locale}/${d.slug}`,
    title: d.title,
    excerpt: d.excerpt ?? undefined,
    meta: d.topics?.length ? topicLabel(d.topics[0], locale) : undefined,
    coverImage: d.coverImage,
    seed: typeof d.id === 'number' ? d.id : 0,
  }))
  return (
    <PageShell locale={locale} title={section.title[locale]} intro={section.intro[locale]}>
      <TopicFilter
        locale={locale}
        basePath={`/${locale}/${SLUG}`}
        available={availableTopics(docs)}
        active={topic}
      />
      <ContentList locale={locale} items={items} />
    </PageShell>
  )
}
