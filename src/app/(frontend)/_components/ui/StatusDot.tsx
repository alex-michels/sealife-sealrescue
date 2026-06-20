import { cx } from './cx'

/**
 * Статус-точка центра (DESIGN_BRIEF §3). Значения совпадают с `rescue-centers.status`.
 * Используется на карточках центров (sealrescue) рядом со «штампом проверки».
 */
export type CenterStatus = 'active' | 'unconfirmed' | 'link_broken' | 'needs_check'

const meta: Record<CenterStatus, { color: string; ru: string; en: string }> = {
  active: { color: 'var(--color-baltic)', ru: 'Активен', en: 'Active' },
  needs_check: { color: 'var(--color-buoy)', ru: 'Требует проверки', en: 'Needs check' },
  link_broken: { color: 'var(--color-pebble)', ru: 'Ссылка сломана', en: 'Link broken' },
  unconfirmed: { color: 'var(--color-pebble)', ru: 'Не подтверждён', en: 'Unconfirmed' },
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
