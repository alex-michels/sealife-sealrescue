import { sampleNews } from '@/mock/sample'
import {
  requireSection,
  sectionMetadata,
  SectionListView,
  parseState,
  type RouteParams,
  type SearchParams,
} from '@/app/(frontend)/_components/mock/mockSection'

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
  const { site, locale, section } = await requireSection(params, SLUG)
  const state = parseState((await searchParams).state)
  const items = sampleNews.map((n, i) => ({
    href: `/${locale}/${SLUG}/${n.slug}`,
    title: n.title[locale],
    excerpt: n.excerpt[locale],
    meta: n.date,
    seed: i + 2,
  }))
  return (
    <SectionListView
      site={site}
      locale={locale}
      slug={SLUG}
      title={section.title[locale]}
      intro={section.intro[locale]}
      items={items}
      state={state}
    />
  )
}
