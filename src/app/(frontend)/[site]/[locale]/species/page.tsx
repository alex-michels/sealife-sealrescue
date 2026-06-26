import {
  requireSection,
  sectionMetadata,
  type RouteParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { PageShell } from '@/app/(frontend)/_components/content/PageShell'
import { ContentList } from '@/app/(frontend)/_components/content/ContentList'
import { FactOfDay } from '@/app/(frontend)/_components/content/FactOfDay'
import { findAllSpecies } from '@/app/(frontend)/_components/content/getSpecies'
import { pickOfDay } from '@/content/factOfDay'

const SLUG = 'species'

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function SpeciesPage({ params }: { params: RouteParams }) {
  const { locale, section } = await requireSection(params, SLUG)
  const species = await findAllSpecies(locale)

  // «Факт дня»: плоский список всех фактов всех видов → детерминированный выбор по дате.
  const factPool = species.flatMap((s) =>
    (s.facts ?? []).map((f) => ({ fact: f.text, name: s.name, href: `/${locale}/species/${s.slug}` })),
  )
  const today = pickOfDay(factPool)

  const items = species.map((s) => ({
    href: `/${locale}/species/${s.slug}`,
    title: s.name,
    excerpt: s.excerpt ?? undefined,
    meta: s.latin,
    coverImage: s.coverImage,
    seed: typeof s.id === 'number' ? s.id + 5 : 5,
  }))

  return (
    <PageShell locale={locale} title={section.title[locale]} intro={section.intro[locale]}>
      {today && (
        <FactOfDay
          locale={locale}
          fact={today.fact}
          speciesName={today.name}
          speciesHref={today.href}
        />
      )}
      <ContentList locale={locale} items={items} />
    </PageShell>
  )
}
