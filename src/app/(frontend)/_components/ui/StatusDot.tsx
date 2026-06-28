import { cx } from './cx'
import type { Locale } from '@/i18n/config'

/**
 * Статус-точка центра (DESIGN_BRIEF §4). Значения = `rescue-centers.status`.
 * Цвет — НЕ единственный носитель смысла: всегда сопровождается текстом (WCAG 2.2 AA).
 * Палитра статусов: active зелёная · needs_check янтарная · link_broken красная · unconfirmed серая.
 */
export type CenterStatus = 'active' | 'unconfirmed' | 'link_broken' | 'needs_check'

const meta: Record<CenterStatus, { color: string; label: Record<Locale, string> }> = {
  active: {
    color: 'var(--color-status-active)',
    label: { ru: 'Активен', en: 'Active', de: 'Aktiv' },
  },
  needs_check: {
    color: 'var(--color-status-check)',
    label: { ru: 'Требует проверки', en: 'Needs check', de: 'Prüfung nötig' },
  },
  link_broken: {
    color: 'var(--color-status-broken)',
    label: { ru: 'Ссылка сломана', en: 'Link broken', de: 'Link defekt' },
  },
  unconfirmed: {
    color: 'var(--color-status-unverified)',
    label: { ru: 'Не подтверждён', en: 'Unconfirmed', de: 'Unbestätigt' },
  },
}

export function StatusDot({
  status,
  locale = 'ru',
  showLabel = false,
  className,
}: {
  status: CenterStatus
  locale?: Locale
  showLabel?: boolean
  className?: string
}) {
  const m = meta[status]
  const label = m.label[locale]
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-sm', className)}>
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: m.color }}
      />
      {showLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </span>
  )
}
