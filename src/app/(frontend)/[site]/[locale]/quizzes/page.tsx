import { sampleQuizzes } from '@/mock/sample'
import {
  requireSection,
  sectionMetadata,
  SectionListView,
  parseState,
  type RouteParams,
  type SearchParams,
} from '@/app/(frontend)/_components/mock/mockSection'

const SLUG = 'quizzes'

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function QuizzesPage({
  params,
  searchParams,
}: {
  params: RouteParams
  searchParams: SearchParams
}) {
  const { site, locale, section } = await requireSection(params, SLUG)
  const state = parseState((await searchParams).state)
  const items = sampleQuizzes.map((q, i) => ({
    href: `/${locale}/${SLUG}/${q.slug}`,
    title: q.title[locale],
    excerpt: q.excerpt[locale],
    meta: { ru: `${q.questions} вопр.`, en: `${q.questions} questions`, de: `${q.questions} Fragen` }[locale],
    seed: i + 3,
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
