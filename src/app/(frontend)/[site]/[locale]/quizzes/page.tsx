import {
  requireSection,
  sectionMetadata,
  type RouteParams,
  type SearchParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { PageShell } from '@/app/(frontend)/_components/content/PageShell'
import { ContentList } from '@/app/(frontend)/_components/content/ContentList'
import { Pagination } from '@/app/(frontend)/_components/content/Pagination'
import { findAllQuizzes } from '@/app/(frontend)/_components/content/getQuizzes'
import { parsePage } from '@/content/pagination'
import { answerableQuestions } from '@/content/quiz'
import { t } from '@/i18n/ui'

/**
 * Список квизов (Roadmap **M1-T10**). До этой задачи раздел рендерился из выдуманных
 * `sampleQuizzes`, а коллекция `quizzes` в Payload стояла без единого читателя.
 *
 * CR-16: /de content paths are rejected by the proxy before list streaming.
 * A future list skeleton must remain separate from quiz detail routes.
 */
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
  const { locale, section } = await requireSection(params, SLUG)
  const page = parsePage((await searchParams).page)
  const { docs: quizzes, totalPages } = await findAllQuizzes(locale, page) // CR-07

  const items = quizzes.map((quiz) => ({
    href: `/${locale}/${SLUG}/${quiz.slug}`,
    title: quiz.title,
    excerpt: quiz.description ?? undefined,
    // Считаем только те вопросы, которые в этой локали реально можно показать: `questions` —
    // не локализованный массив, локализованы поля внутри (полевой случай CR-01).
    meta: `${t(locale, 'quizQuestions')}: ${answerableQuestions(quiz.questions).length}`,
    seed: typeof quiz.id === 'number' ? quiz.id + 6 : 6,
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
