import type { ReactNode } from 'react'
import { cx } from './cx'
import { StatusDot, type CenterStatus } from './StatusDot'
import type { Locale } from '@/i18n/config'

/**
 * Штамп проверки (DESIGN_BRIEF §5/§15) — центральный trust-паттерн sealrescue, НЕ декор.
 * Моно-стиль: заголовок-«штамп» + строка provenance (агент/человек/статус). Цвет — не
 * единственный носитель смысла: состояние всегда продублировано текстом (WCAG 2.2 AA).
 *
 * Provenance-поля (agentCheckedAt / humanReviewedAt) лягут на схему Content/RescueCenter
 * (EU-11, M1-T08). Здесь — переиспользуемый примитив; реальные данные — в M2 (карточки центров).
 */
const copy: Record<Locale, Record<'both' | 'agent' | 'human' | 'none' | 'agentLabel' | 'humanLabel', string>> = {
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
  de: {
    both: 'Von Agent und Mensch geprüft',
    agent: 'Vom Agent geprüft · wartet auf Mensch',
    human: 'Von Mensch geprüft',
    none: 'Nicht geprüft',
    agentLabel: 'Agent',
    humanLabel: 'Mensch',
  },
}

/** DD.MM.YYYY (как в брифе). UTC-части — детерминированно на сервере, без сдвига по таймзоне. */
function fmtDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getUTCFullYear()}`
}

function StampIcon({ verified }: { verified: boolean }) {
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
        <path d="M8 4.8v3.6M8 10.8h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  const hasAgent = Boolean(agentCheckedAt)
  const hasHuman = Boolean(humanReviewedAt)
  const verified = hasAgent || hasHuman
  const headline = hasAgent && hasHuman ? c.both : hasHuman ? c.human : hasAgent ? c.agent : c.none

  const details: ReactNode[] = []
  if (agentCheckedAt) details.push(`${c.agentLabel}: ${fmtDate(agentCheckedAt)}`)
  if (humanReviewedAt) details.push(`${c.humanLabel}: ${fmtDate(humanReviewedAt)}`)
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
