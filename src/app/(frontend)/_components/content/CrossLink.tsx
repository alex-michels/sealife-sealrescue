import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { siteBaseUrl, sites } from '@/site/config'
import { buttonClasses } from '../ui/Button'

/**
 * Перелинковка sealife → sealrescue (M1-T04) в двух регистрах:
 *  - `emergency` — тревожный CTA «Нашёл тюленя? Это не шутки» (--critical), для главной/срочных мест.
 *  - `curious`   — спокойный «А как вообще спасают тюленей?», для статей/видов (познавательный контекст).
 *
 * Ведёт на другой домен (sealrescue.info), поэтому ссылка абсолютная (<a>, не <Link>).
 * Можно указать целевой путь (по умолчанию «что делать» — точка входа спасения).
 */
export function CrossLink({
  locale,
  variant = 'curious',
  path = '/what-to-do',
}: {
  locale: Locale
  variant?: 'emergency' | 'curious'
  path?: string
}) {
  const href = `${siteBaseUrl(sites.sealrescue)}/${locale}${path}`
  const emergency = variant === 'emergency'

  return (
    <aside
      className={`mt-12 flex flex-col items-start gap-4 rounded-card border border-border p-6 sm:flex-row sm:items-center sm:justify-between ${
        emergency ? 'bg-surface-warm' : 'bg-surface-info'
      }`}
    >
      <p className="text-lg text-text">
        {t(locale, emergency ? 'crossRescue' : 'crossRescueCurious')}
      </p>
      <a
        href={href}
        className={buttonClasses(emergency ? 'critical' : 'primary', 'lg', 'shrink-0')}
      >
        {t(locale, emergency ? 'crossRescueCta' : 'crossRescueCuriousCta')}
      </a>
    </aside>
  )
}
