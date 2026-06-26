import { notFound } from 'next/navigation'
import { findQuiz } from '@/mock/sample'
import {
  requireDetail,
  detailMetadata,
  type SlugParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { SampleDetail } from '@/app/(frontend)/_components/mock/SampleDetail'

const SLUG = 'quizzes'

export function generateMetadata({ params }: { params: SlugParams }) {
  return detailMetadata(params, SLUG, (locale, slug) => findQuiz(slug)?.title[locale])
}

export default async function QuizDetail({ params }: { params: SlugParams }) {
  const { locale, slug, section } = await requireDetail(params, SLUG)
  const quiz = findQuiz(slug)
  if (!quiz) notFound()
  return (
    <SampleDetail
      locale={locale}
      backHref={`/${locale}/${SLUG}`}
      backLabel={section.title[locale]}
      meta={locale === 'en' ? `${quiz.questions} questions` : `${quiz.questions} вопросов`}
      title={quiz.title[locale]}
      seed={3}
      body={[quiz.excerpt[locale]]}
    >
      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          {locale === 'en' ? 'Sample question' : 'Пример вопроса'}
        </p>
        <h2 className="mt-1 text-xl">{quiz.sample.q[locale]}</h2>
        <ul className="mt-3 space-y-2">
          {quiz.sample.options.map((o, i) => (
            <li key={i}>
              <span className="block rounded-btn border border-border px-3 py-2">{o[locale]}</span>
            </li>
          ))}
        </ul>
      </div>
    </SampleDetail>
  )
}
