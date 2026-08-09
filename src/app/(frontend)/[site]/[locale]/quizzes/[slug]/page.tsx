import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { t } from '@/i18n/ui'
import { getSection } from '@/site/sections'
import { findQuizBySlug, quizLocales } from '@/app/(frontend)/_components/content/getQuizzes'
import { AiBadge } from '@/app/(frontend)/_components/content/AiBadge'
import { buttonClasses } from '@/app/(frontend)/_components/ui/Button'
import { cx } from '@/app/(frontend)/_components/ui/cx'
import {
  answerParam,
  answerableQuestions,
  isSubmitted,
  parseAnswers,
  scoreQuiz,
  SUBMITTED_PARAM,
  type QuizQuestion,
} from '@/content/quiz'

/**
 * Прохождение квиза (Roadmap **M1-T10**).
 *
 * Это обычная HTML-форма с `method="get"`: нативные группы radio, ответы уезжают в query,
 * результат считает сервер (`src/content/quiz.ts`). Ни строчки клиентского JS, ничего не пишется
 * ни в localStorage (инвариант №4 прямо называет «очки квизов»), ни в БД — рейтинг вынесен в
 * отдельную задачу. Кнопка «назад» работает сама: предыдущий URL и есть предыдущее состояние.
 */
type SlugParams = Promise<{ site: string; locale: string; slug: string }>
type Query = Promise<Record<string, string | string[] | undefined>>
const SLUG = 'quizzes'

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale) || !getSection(site, SLUG)) return {}
  const quiz = await findQuizBySlug(locale as Locale, slug)
  if (!quiz) return {}
  return {
    title: quiz.title,
    description: quiz.description || undefined,
    alternates: buildAlternates(`/${SLUG}/${slug}`, locale as Locale, sites[site], await quizLocales(slug)),
  }
}

export default async function QuizDetail({
  params,
  searchParams,
}: {
  params: SlugParams
  searchParams: Query
}) {
  const { site, locale: rawLocale, slug } = await params
  if (!isSite(site) || !isLocale(rawLocale) || !getSection(site, SLUG)) notFound()
  const locale = rawLocale as Locale

  const quiz = await findQuizBySlug(locale, slug)
  if (!quiz) notFound()

  const query = await searchParams
  // Показываем только те вопросы, которые в этой локали реально можно ответить (CR-01: массивы
  // `questions`/`options` не локализованы, локализованы поля внутри).
  const questions = answerableQuestions(quiz.questions)
  const answers = parseAnswers(query, questions)
  const submitted = isSubmitted(query) && questions.length > 0
  const result = submitted ? scoreQuiz(questions, answers) : null

  const section = getSection(site, SLUG)!

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href={`/${locale}/${SLUG}`} className="font-mono text-xs text-muted hover:text-link">
        ← {section.title[locale]}
      </Link>

      <h1 className="mt-3 text-4xl">{quiz.title}</h1>
      <AiBadge locale={locale} provenance={quiz.provenance} aiGenerated={quiz.aiGenerated} />
      {quiz.description && <p className="mt-6 text-xl text-muted">{quiz.description}</p>}

      {questions.length === 0 ? (
        /*
         * Заголовок переведён (иначе документ не прошёл бы гейт), а вопросы в этой локали ещё нет.
         * Пустая форма была бы хуже честной строки, а 404 — неправдой: квиз существует.
         */
        <p className="mt-8 rounded-card border border-border-cool bg-surface-info p-6 text-text">
          {t(locale, 'quizNoQuestions')}
        </p>
      ) : result ? (
        <Result locale={locale} questions={questions} result={result} slug={slug} />
      ) : (
        <Questions locale={locale} questions={questions} />
      )}
    </div>
  )
}

/** Вопросы формой. `fieldset`/`legend` — нативная семантика группы radio, не самодельная. */
function Questions({ locale, questions }: { locale: Locale; questions: QuizQuestion[] }) {
  return (
    <form method="get" className="mt-8">
      {/* Маркер отправки: без него прямая ссылка на квиз показывала бы результат, ничего не спросив. */}
      <input type="hidden" name={SUBMITTED_PARAM} value="1" />
      <ol className="space-y-6">
        {questions.map((q, qi) => (
          <li key={qi}>
            <fieldset className="rounded-card border border-border bg-surface p-6">
              <legend className="px-1 text-xl text-heading-sub">{q.question}</legend>
              <div className="mt-3 space-y-2">
                {(q.options ?? []).map((o, oi) => {
                  const id = `q${qi}-o${oi}`
                  return (
                    <div key={oi} className="flex items-start gap-3">
                      <input
                        type="radio"
                        id={id}
                        name={answerParam(qi)}
                        value={oi}
                        className="mt-1.5 h-4 w-4 shrink-0 accent-primary"
                      />
                      {/*
                        `flex-1` — метка занимает ВСЮ строку, а не только ширину слов: кликается
                        любое место строки, а не пять букв. Плюс `min-h-6` держит высоту цели
                        ≥24px (WCAG 2.2 §2.5.8).
                      */}
                      <label htmlFor={id} className="flex min-h-6 flex-1 cursor-pointer items-center">
                        {o.text}
                      </label>
                    </div>
                  )
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <button type="submit" className={buttonClasses('primary', 'lg', 'mt-8')}>
        {t(locale, 'quizSubmit')}
      </button>
    </form>
  )
}

/** Результат: счёт + разбор по вопросам с объяснениями. */
function Result({
  locale,
  questions,
  result,
  slug,
}: {
  locale: Locale
  questions: QuizQuestion[]
  result: NonNullable<ReturnType<typeof scoreQuiz>>
  slug: string
}) {
  return (
    <div className="mt-8">
      <div className="rounded-card border border-border-cool bg-surface-info p-6">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          {t(locale, 'quizResult')}
        </p>
        <p className="mt-2 text-3xl text-heading">
          {result.correct} / {result.total}
        </p>
        {result.unscorable > 0 && (
          // Честно говорим, что часть вопросов не оценивалась, вместо тихого занижения результата.
          <p className="mt-2 text-sm text-muted">
            {t(locale, 'quizUnscorable')}: {result.unscorable}
          </p>
        )}
      </div>

      <ol className="mt-6 space-y-4">
        {questions.map((q, qi) => {
          const o = result.outcomes[qi]
          const options = q.options ?? []
          return (
            <li key={qi} className="rounded-card border border-border bg-surface p-6">
              <p className="text-xl text-heading-sub">{q.question}</p>
              <ul className="mt-3 space-y-1">
                {options.map((opt, oi) => {
                  const chosen = o.chosen === oi
                  const correct = o.correct.includes(oi)
                  return (
                    <li
                      key={oi}
                      className={cx(
                        'flex items-start gap-2',
                        correct ? 'text-text' : 'text-muted',
                      )}
                    >
                      {/*
                        Цвет не единственный носитель смысла (WCAG 2.2 AA): у каждой строки есть
                        текстовая пометка, разница читается и в ч/б.
                        Фиксированная ширина колонки — чтобы варианты выстроились столбцом:
                        подписи разной длины иначе сдвигают текст ответов и разбор читается рвано.
                      */}
                      <span className="w-28 shrink-0 pt-1 font-mono text-xs uppercase tracking-wide">
                        {correct ? t(locale, 'quizCorrect') : chosen ? t(locale, 'quizYours') : '·'}
                      </span>
                      <span className={cx(correct && 'font-semibold')}>{opt.text}</span>
                    </li>
                  )
                })}
              </ul>
              {o.chosen === null && !o.unscorable && (
                <p className="mt-3 text-sm text-muted">{t(locale, 'quizUnanswered')}</p>
              )}
              {o.unscorable && (
                <p className="mt-3 text-sm text-muted">{t(locale, 'quizUnscorable')}</p>
              )}
              {q.explanation && <p className="mt-3 text-muted">{q.explanation}</p>}
            </li>
          )
        })}
      </ol>

      {/* «Заново» — ссылка на чистый путь: состояние живёт только в URL, сбрасывать нечего. */}
      <Link href={`/${locale}/${SLUG}/${slug}`} className={buttonClasses('ghost', 'lg', 'mt-8')}>
        {t(locale, 'quizRetry')}
      </Link>
    </div>
  )
}
