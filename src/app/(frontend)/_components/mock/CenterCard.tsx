import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { m } from '@/mock/copy'
import type { SampleCenter } from '@/mock/sample'
import { buttonClasses } from '../ui/Button'
import { StatusDot } from '../ui/StatusDot'
import { VerificationStamp } from '../ui/VerificationStamp'

/**
 * Карточка центра (DESIGN_BRIEF §7): статус-точка + штамп проверки + действия
 * (tel:, сайт, маршрут, сообщить об ошибке). tel: — реальная ссылка (§13);
 * сайт/маршрут — внешние функциональные ссылки; «сообщить» ведёт на /report.
 */
export function CenterCard({
  center,
  locale,
  detailHref,
}: {
  center: SampleCenter
  locale: Locale
  detailHref?: string
}) {
  const c = m(locale)
  const tel = `tel:${center.phone.replace(/\s+/g, '')}`
  const mapHref = `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${center.city} ${center.country}`)}`
  return (
    <li className="rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl">
            {detailHref ? (
              <Link href={detailHref} className="hover:text-link">
                {center.name}
              </Link>
            ) : (
              center.name
            )}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {center.city} · {center.country}
          </p>
        </div>
        <StatusDot status={center.status} locale={locale} showLabel />
      </div>

      <p className="mt-3 text-muted">{center.summary[locale]}</p>

      <div className="mt-4">
        <VerificationStamp
          locale={locale}
          status={center.status}
          agentCheckedAt={center.agentCheckedAt}
          humanReviewedAt={center.humanReviewedAt}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={tel} className={buttonClasses('primary', 'sm')}>
          {c.call}
        </a>
        <a href={center.website} target="_blank" rel="noopener noreferrer" className={buttonClasses('ghost', 'sm')}>
          {c.website}
        </a>
        <a href={mapHref} target="_blank" rel="noopener noreferrer" className={buttonClasses('ghost', 'sm')}>
          {c.route}
        </a>
        <Link href={`/${locale}/report`} className={buttonClasses('ghost', 'sm')}>
          {c.reportIssue}
        </Link>
      </div>
    </li>
  )
}
