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
  parseTopic,
} from '@/app/(frontend)/_components/content/getContent'
import { Pagination } from '@/app/(frontend)/_components/content/Pagination'
import { parsePage } from '@/content/pagination'
import { formatDate } from '@/i18n/date'

const SLUG = 'news'

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: RouteParams
  searchParams: SearchParams
}) {
  const { locale, section } = await requireSection(params, SLUG)
  const sp = await searchParams
  const topic = parseTopic(sp.topic)
  const page = parsePage(sp.page)
  // CR-07: страница списка читается страницей; фильтр по теме ушёл в запрос, а чипы тем считаются
  // отдельно — иначе на второй странице набор тем менялся бы.
  const [{ docs, totalPages }, topics] = await Promise.all([
    findContentByType('news', locale, { page, topic }),
    availableTopics('news', locale),
  ])
  const items = docs.map((d) => ({
    href: `/${locale}/${d.slug}`,
    title: d.title,
    excerpt: d.excerpt ?? undefined,
    meta: formatDate(d.publishedAt ?? d.updatedAt, locale), // CR-05
    coverImage: d.coverImage,
    seed: typeof d.id === 'number' ? d.id : 0,
  }))
  return (
    <PageShell locale={locale} title={section.title[locale]} intro={section.intro[locale]}>
      <TopicFilter
        locale={locale}
        basePath={`/${locale}/${SLUG}`}
        available={topics}
        active={topic}
      />
      <ContentList locale={locale} items={items} />
      <Pagination
        locale={locale}
        basePath={`/${locale}/${SLUG}`}
        page={page}
        totalPages={totalPages}
        params={{ topic }}
      />
    </PageShell>
  )
}
