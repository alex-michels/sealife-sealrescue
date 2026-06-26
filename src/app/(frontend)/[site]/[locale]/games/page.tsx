import { sampleGames } from '@/mock/sample'
import {
  requireSection,
  sectionMetadata,
  SectionListView,
  parseState,
  type RouteParams,
  type SearchParams,
} from '@/app/(frontend)/_components/mock/mockSection'

const SLUG = 'games'

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function GamesPage({
  params,
  searchParams,
}: {
  params: RouteParams
  searchParams: SearchParams
}) {
  const { site, locale, section } = await requireSection(params, SLUG)
  const state = parseState((await searchParams).state)
  const items = sampleGames.map((g, i) => ({
    href: `/${locale}/${SLUG}/${g.slug}`,
    title: g.title[locale],
    excerpt: g.excerpt[locale],
    meta: locale === 'en' ? 'Game' : 'Игра',
    seed: i + 4,
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
