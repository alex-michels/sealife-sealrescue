'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { locales, localeLabels, type Locale } from '@/i18n/config'
import { cx } from './ui/cx'

/**
 * Переключатель языка (DESIGN_BRIEF §9): названия ТЕКСТОМ, не флагами (язык ≠ страна);
 * всегда виден (header + footer); доступен с клавиатуры и скринридера.
 *
 * Язык хранится ТОЛЬКО после явного выбора (клик) — ставим cookie `NEXT_LOCALE`
 * здесь, а не автоматически в proxy (COMPLIANCE §3 / CLAUDE.md). slug канонический,
 * поэтому переключение = тот же путь с другим префиксом локали.
 */
const LOCALE_RE = new RegExp(`^/(${locales.join('|')})(?=/|$)`)
const ONE_YEAR = 60 * 60 * 24 * 365

export function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() || `/${current}`
  const rest = pathname.replace(LOCALE_RE, '') // '' для главной, '/slug' для страницы

  const remember = (locale: Locale) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`
  }

  return (
    <nav
      aria-label="Language"
      className="inline-flex items-center gap-1 rounded-btn border border-border p-1 text-sm"
    >
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}${rest}`}
          hrefLang={locale}
          lang={locale}
          aria-current={locale === current ? 'true' : undefined}
          onClick={() => remember(locale)}
          className={cx(
            'inline-flex min-h-6 items-center rounded-btn px-2.5 py-1 transition-colors',
            locale === current ? 'bg-primary text-white' : 'text-muted hover:text-text',
          )}
        >
          {localeLabels[locale]}
        </Link>
      ))}
    </nav>
  )
}
