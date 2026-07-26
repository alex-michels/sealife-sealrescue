import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { formatDate } from '@/i18n/date'

/**
 * Чистая логика provenance-шкалы (EU-11). Живёт ВНЕ `src/app/`, потому что порог покрытия
 * (`vitest.config.mts`) считает только `src/**` за вычетом `src/app/**` — а это ровно та логика,
 * которую хочется держать под замком: она решает, какое утверждение о материале увидит читатель.
 * Рендер — в `_components/content/AiBadge.tsx`.
 */

/**
 * Локализованная часть группы `provenance` + нелокализованный `sourceVerified`. Специально не
 * `Content['provenance']`: одну и ту же шкалу носят `content`, `species` и `quizzes`, а
 * `reviewedBy` сюда не входит — имена штатных рецензентов публично не показываем.
 */
export type ProvenanceFacts = {
  aiAssisted?: boolean | null
  aiTranslated?: boolean | null
  aiChecked?: boolean | null
  humanReviewed?: boolean | null
  reviewedAt?: string | null
  sourceVerified?: boolean | null
}

/** Сила утверждения: машина → подтверждённая фактура → человек. Задаёт вид метки. */
export type ProvenanceTone = 'ai' | 'verified' | 'human'

export type ProvenanceMarkKey =
  | 'legacy'
  | 'aiAssisted'
  | 'aiTranslated'
  | 'aiChecked'
  | 'sourceVerified'
  | 'humanReviewed'

export type ProvenanceMark = {
  key: ProvenanceMarkKey
  tone: ProvenanceTone
  label: string
}

/**
 * Дата ревью — только если она разбирается. «Проверено человеком · Invalid Date» подрывает
 * ровно то доверие, ради которого метка существует; лучше метка без даты.
 */
function reviewedOn(iso: string | null | undefined, locale: Locale): string | null {
  if (!iso) return null
  if (Number.isNaN(new Date(iso).getTime())) return null
  return formatDate(iso, locale)
}

/**
 * Чистый выбор меток. Порядок — как в жизни материала: черновик → перевод → сверка фактов →
 * подтверждение источников → вычитка человеком. Человеческое ревью последнее не случайно:
 * это вывод цепочки, а не ещё один флажок в ряду.
 */
export function provenanceMarks(
  locale: Locale,
  provenance?: ProvenanceFacts | null,
  legacyAiGenerated?: boolean | null,
): ProvenanceMark[] {
  const p = provenance ?? {}
  const marks: ProvenanceMark[] = []

  if (p.aiAssisted) {
    marks.push({ key: 'aiAssisted', tone: 'ai', label: t(locale, 'provAiAssisted') })
  }
  if (p.aiTranslated) {
    marks.push({ key: 'aiTranslated', tone: 'ai', label: t(locale, 'provAiTranslated') })
  }
  if (p.aiChecked) {
    marks.push({ key: 'aiChecked', tone: 'ai', label: t(locale, 'provAiChecked') })
  }
  if (p.sourceVerified) {
    marks.push({ key: 'sourceVerified', tone: 'verified', label: t(locale, 'provSourceVerified') })
  }
  if (p.humanReviewed) {
    const on = reviewedOn(p.reviewedAt, locale)
    const label = t(locale, 'provHumanReviewed')
    marks.push({ key: 'humanReviewed', tone: 'human', label: on ? `${label} · ${on}` : label })
  }

  // Легаси-флаг — только как запасной вариант для записей, которые новую группу ещё не заполнили.
  if (marks.length === 0 && legacyAiGenerated) {
    marks.push({ key: 'legacy', tone: 'ai', label: t(locale, 'aiGenerated') })
  }

  return marks
}
