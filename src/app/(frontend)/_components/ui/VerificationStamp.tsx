import type { ReactNode } from 'react'
import { cx } from './cx'
import { StatusDot, type CenterStatus } from './StatusDot'
import type { Locale } from '@/i18n/config'

/**
 * Штамп проверки (DESIGN_BRIEF §5/§15) — центральный trust-паттерн sealrescue, НЕ декор.
 * Моно-стиль: заголовок-«штамп» + строка provenance (агент/человек/статус). Цвет — не
 * единственный носитель смысла: состояние всегда продублировано текстом (WCAG 2.2 AA).
 *
 * ## Откуда брать даты (поля уже в схеме, EU-11 / M1-T08)
 * Примитив принимает даты как есть, ничего не знает о коллекциях и не ходит в БД:
 *  - `rescue-centers` → `verifiedByAgentAt` / `verifiedByHumanAt` (`src/collections/RescueCenters.ts`);
 *  - `content` / `species` / `quizzes` → `provenance.lastAgentCheckedAt` /
 *    `provenance.lastHumanVerifiedAt` (`src/fields/provenance.ts`; там же локализованный
 *    `provenance.humanReviewed` — авторство текста, его показывает `AiBadge`, а не штамп).
 *
 * Страницы центров пока на моках (`src/mock/sample.ts`); подключение реальных документов —
 * **M2-T02**. Инвариант №7 при этом на компоненте: без дат заголовок честно говорит «Не
 * проверено», а неразбираемая дата приравнивается к её отсутствию — «проверено» без даты
 * выглядит как подтверждение, которого не было.
 */
const copy: Record<
  Locale,
  Record<'both' | 'agent' | 'human' | 'none' | 'agentLabel' | 'humanLabel', string>
> = {
  ru: {
    both: 'Проверено агентом и человеком',
    agent: 'Проверено агентом · ожидает человека',
    human: 'Проверено человеком',
    none: 'Не проверено',
    agentLabel: 'агент',
    humanLabel: 'человек',
  },
  en: {
    both: 'Checked by agent and human',
    agent: 'Checked by agent · awaiting human',
    human: 'Reviewed by human',
    none: 'Not verified',
    agentLabel: 'agent',
    humanLabel: 'human',
  },
}

/**
 * DD.MM.YYYY (как в брифе). UTC-части — детерминированно на сервере, без сдвига по таймзоне.
 * `null` на неразбираемом значении: вызывающий код обязан считать такую дату отсутствующей,
 * иначе штамп заявит проверку, подтвердить которую нечем.
 */
function fmtDate(value: string | Date): string | null {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getUTCFullYear()}`
}

/** Иконка штампа: сплошной круг с галкой = проверено, пунктир с «!» = нет. Переиспользуется
 *  в `AiBadge` для метки «Проверено человеком» — сильнейшее утверждение шкалы provenance. */
export function StampIcon({ verified }: { verified: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray={verified ? undefined : '2.4 2.2'}
      />
      {verified ? (
        <path
          d="M5 8.2l2 2 4-4.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M8 4.8v3.6M8 10.8h.01"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

export function VerificationStamp({
  status,
  agentCheckedAt,
  humanReviewedAt,
  locale = 'ru',
  className,
}: {
  status?: CenterStatus
  agentCheckedAt?: string | Date | null
  humanReviewedAt?: string | Date | null
  locale?: Locale
  className?: string
}) {
  const c = copy[locale]
  // Дата, которую не удалось разобрать, = проверки не было (инвариант №7: не выдавать
  // неподтверждённое за verified).
  const agentAt = agentCheckedAt ? fmtDate(agentCheckedAt) : null
  const humanAt = humanReviewedAt ? fmtDate(humanReviewedAt) : null
  const hasAgent = agentAt !== null
  const hasHuman = humanAt !== null
  const verified = hasAgent || hasHuman
  const headline = hasAgent && hasHuman ? c.both : hasHuman ? c.human : hasAgent ? c.agent : c.none

  const details: ReactNode[] = []
  if (agentAt) details.push(`${c.agentLabel}: ${agentAt}`)
  if (humanAt) details.push(`${c.humanLabel}: ${humanAt}`)
  if (status) details.push(<StatusDot status={status} locale={locale} showLabel />)

  return (
    <div
      className={cx(
        'inline-flex flex-col gap-1 rounded-btn border px-3 py-2 font-mono',
        verified ? 'border-border-cool' : 'border-border',
        className,
      )}
    >
      <span
        className={cx(
          'inline-flex items-center gap-1.5 text-sm font-semibold',
          verified ? 'text-primary' : 'text-muted',
        )}
      >
        <StampIcon verified={verified} />
        {headline}
      </span>
      {details.length > 0 && (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          {details.map((node, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
              )}
              {node}
            </span>
          ))}
        </span>
      )}
    </div>
  )
}
