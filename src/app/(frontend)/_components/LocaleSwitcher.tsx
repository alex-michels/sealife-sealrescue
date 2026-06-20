import Link from 'next/link'
import { locales, localeLabels, type Locale } from '@/i18n/config'
import { cx } from './ui/cx'

/**
 * Переключатель языка. slug канонический и общий для локалей, поэтому
 * переключение = тот же pathSuffix с другим префиксом локали.
 */
export function LocaleSwitcher({ locale, pathSuffix }: { locale: Locale; pathSuffix: string }) {
  return (
    <nav
      aria-label="Language"
      className="inline-flex items-center gap-1 rounded-btn border border-line p-1 text-sm"
    >
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${pathSuffix}`}
          hrefLang={l}
          aria-current={l === locale ? 'true' : undefined}
          className={cx(
            'rounded-btn px-2.5 py-1 transition-colors',
            l === locale ? 'bg-primary text-fog' : 'text-muted hover:text-fg',
          )}
        >
          {localeLabels[l]}
        </Link>
      ))}
    </nav>
  )
}
