import { sampleArticles } from '@/mock/sample'
import {
  requireSection,
  sectionMetadata,
  SectionListView,
  parseState,
  type RouteParams,
  type SearchParams,
} from '@/app/(frontend)/_components/mock/mockSection'

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
  const { site, locale, section } = await requireSection(params, SLUG)
  const state = parseState((await searchParams).state)
  const items = sampleArticles.map((a, i) => ({
    href: `/${locale}/${SLUG}/${a.slug}`,
    title: a.title[locale],
    excerpt: a.excerpt[locale],
    meta: locale === 'en' ? `${a.readMin} min` : `${a.readMin} мин`,
    seed: i + 1,
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
