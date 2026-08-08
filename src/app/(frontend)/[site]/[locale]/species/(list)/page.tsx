import {
  requireSection,
  sectionMetadata,
  type RouteParams,
  type SearchParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { PageShell } from '@/app/(frontend)/_components/content/PageShell'
import { ContentList } from '@/app/(frontend)/_components/content/ContentList'
import { FactOfDay } from '@/app/(frontend)/_components/content/FactOfDay'
import { findAllSpecies, allSpeciesFacts } from '@/app/(frontend)/_components/content/getSpecies'
import { Pagination } from '@/app/(frontend)/_components/content/Pagination'
import { parsePage } from '@/content/pagination'
import { pickOfDay } from '@/content/factOfDay'
import { factPool } from '@/content/bento'

const SLUG = 'species'

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function SpeciesPage({
  params,
  searchParams,
}: {
  params: RouteParams
  searchParams: SearchParams
}) {
  const { locale, section } = await requireSection(params, SLUG)
  const page = parsePage((await searchParams).page)
  // CR-07: сетка — страницами, а пул «факта дня» — по ВСЕМ видам отдельным лёгким запросом,
  // иначе «факт дня» превратился бы в «факт первой страницы».
  const [{ docs: species, totalPages }, factSource] = await Promise.all([
    findAllSpecies(locale, page),
    allSpeciesFacts(locale),
  ])

  // «Факт дня»: плоский список всех фактов всех видов → детерминированный выбор по дате.
  // Сборка пула (включая отсев непереведённых фактов — полевой случай CR-01) вынесена в
  // `src/content/bento.ts`: тот же пул нужен плитке «Факт дня» на главной (M1-T05), а две копии
  // правила «какой факт считается переведённым» разъехались бы.
  const today = pickOfDay(factPool(factSource, locale))

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
      <Pagination
        locale={locale}
        basePath={`/${locale}/${SLUG}`}
        page={page}
        totalPages={totalPages}
      />
    </PageShell>
  )
}
