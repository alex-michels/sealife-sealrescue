import { cx } from './cx'

/**
 * Статус-точка центра (DESIGN_BRIEF §4). Значения = `rescue-centers.status`.
 * Цвет — НЕ единственный носитель смысла: всегда сопровождается текстом (WCAG 2.2 AA).
 * Палитра статусов: active зелёная · needs_check янтарная · link_broken красная · unconfirmed серая.
 */
export type CenterStatus = 'active' | 'unconfirmed' | 'link_broken' | 'needs_check'

const meta: Record<CenterStatus, { color: string; ru: string; en: string }> = {
  active: { color: 'var(--color-status-active)', ru: 'Активен', en: 'Active' },
  needs_check: { color: 'var(--color-status-check)', ru: 'Требует проверки', en: 'Needs check' },
  link_broken: { color: 'var(--color-status-broken)', ru: 'Ссылка сломана', en: 'Link broken' },
  unconfirmed: { color: 'var(--color-status-unverified)', ru: 'Не подтверждён', en: 'Unconfirmed' },
}

export function StatusDot({
  status,
  locale = 'ru',
  showLabel = false,
  className,
}: {
  status: CenterStatus
  locale?: 'ru' | 'en'
  showLabel?: boolean
  className?: string
}) {
  const m = meta[status]
  const label = locale === 'en' ? m.en : m.ru
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
