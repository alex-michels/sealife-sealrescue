import {
  requireSection,
  sectionMetadata,
  type RouteParams,
  type SearchParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { PageShell } from '@/app/(frontend)/_components/content/PageShell'
import { ContentList } from '@/app/(frontend)/_components/content/ContentList'
import { cardCover, findAllGames } from '@/app/(frontend)/_components/content/getGames'
import { Pagination } from '@/app/(frontend)/_components/content/Pagination'
import { parsePage } from '@/content/pagination'

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
  const { locale, section } = await requireSection(params, SLUG)
  const page = parsePage((await searchParams).page)
  const { docs: games, totalPages } = await findAllGames(locale, page) // CR-07

  const items = games.map((g) => ({
    href: `/${locale}/${SLUG}/${g.slug}`,
    title: g.title,
    excerpt: g.excerpt ?? undefined,
    meta: { ru: 'Игра', en: 'Game', de: 'Spiel' }[locale],
    // Обложка карточки из админки (Games.coverImage / showCardCover);
    // null → декоративный плейсхолдер по seed.
    coverImage: cardCover(g),
    seed: typeof g.id === 'number' ? g.id + 4 : 4,
  }))

  return (
    <PageShell locale={locale} title={section.title[locale]} intro={section.intro[locale]}>
      <ContentList locale={locale} items={items} />
      <Pagination
        locale={locale}
        basePath={`/${locale}/${SLUG}`}
        page={page}
        totalPages={totalPages}
      />
    </PageShell>
  )
}
