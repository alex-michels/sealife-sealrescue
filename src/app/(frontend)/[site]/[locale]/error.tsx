'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { locales, fallbackLocale, type Locale } from '@/i18n/config'
import { isSite, defaultSite, type SiteId } from '@/site/config'
import { m } from '@/mock/copy'
import { buttonClasses } from '@/app/(frontend)/_components/ui/Button'
import { ErrorBlock } from '@/app/(frontend)/_components/mock/ErrorBlock'

/**
 * Error-граница раздела (M0-T19 / DESIGN_BRIEF §4c/§8): ошибка текстом + «обновить».
 * Тон микрокопии зависит от сайта (data-site на <html>), язык — из пути.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Без PII в логах (CLAUDE.md): только сообщение/digest.
    console.error('Section error:', error.message, error.digest)
  }, [error])

  const seg = (usePathname() || '/').split('/')[1]
  const locale: Locale = (locales as readonly string[]).includes(seg) ? (seg as Locale) : fallbackLocale
  const siteAttr = typeof document !== 'undefined' ? document.documentElement.dataset.site : undefined
  const site: SiteId = siteAttr && isSite(siteAttr) ? siteAttr : defaultSite
  const c = m(locale)

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <ErrorBlock
        site={site}
        locale={locale}
        action={
          <button type="button" onClick={reset} className={buttonClasses('primary', 'md')}>
            {c.retry}
          </button>
        }
      />
    </div>
  )
}
