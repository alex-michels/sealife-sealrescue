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
 * ⚠️ **У этого раздела СОЗНАТЕЛЬНО нет `loading.tsx` и нет route-группы `(list)`** — в отличие от
 * species/games/articles. Причина не в лени: loading-граница заставляет Next стримить ответ до
 * `notFound()`, и тогда `/de/quizzes` (контент под legal-only локалью) отдаёт 200 вместо 404.
 * `tests/e2e/legal.e2e.spec.ts` проверяет hard-404 именно на `/quizzes`, потому что это
 * ЕДИНСТВЕННЫЙ контентный раздел без такой границы — то есть единственная точка, где контракт
 * «контента под `/de` не существует» вообще проверяется. Заведёте здесь скелет — контракт
 * перестанет проверяться где-либо. Замерено на `next build`/`next start`: с границей 200, без — 404.
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
