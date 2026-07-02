import {
  requireSection,
  sectionMetadata,
  type RouteParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { PageShell } from '@/app/(frontend)/_components/content/PageShell'
import { ContentList } from '@/app/(frontend)/_components/content/ContentList'
import { findAllGames } from '@/app/(frontend)/_components/content/getGames'

const SLUG = 'games'

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function GamesPage({ params }: { params: RouteParams }) {
  const { locale, section } = await requireSection(params, SLUG)
  const games = await findAllGames(locale)

  const items = games.map((g) => ({
    href: `/${locale}/${SLUG}/${g.slug}`,
    title: g.title,
    excerpt: g.excerpt ?? undefined,
    meta: { ru: 'Игра', en: 'Game', de: 'Spiel' }[locale],
    seed: typeof g.id === 'number' ? g.id + 4 : 4,
  }))

  return (
    <PageShell locale={locale} title={section.title[locale]} intro={section.intro[locale]}>
      <ContentList locale={locale} items={items} />
    </PageShell>
  )
}
