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
  // CR-01, полевой случай: сам массив `facts` НЕ локализован, локализован только `facts.text`.
  // Значит у вида с переведённым `name` (он прошёл гейт) отдельные факты могут быть ещё не
  // переведены и приходят пустыми. Пустая строка в пуле обнулила бы панель «Факт дня» для всей
  // локали, поэтому непереведённые факты отсеиваем здесь, а не полагаемся на гейт документа.
  const factPool = factSource.flatMap((s) =>
    (s.facts ?? [])
      .filter((f) => f.text?.trim())
      .map((f) => ({ fact: f.text, name: s.name, href: `/${locale}/species/${s.slug}` })),
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
      <Pagination
        locale={locale}
        basePath={`/${locale}/${SLUG}`}
        page={page}
        totalPages={totalPages}
      />
    </PageShell>
  )
}
