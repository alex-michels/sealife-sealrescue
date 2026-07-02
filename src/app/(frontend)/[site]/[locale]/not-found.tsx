import Link from 'next/link'
import { headers } from 'next/headers'

import { isLocale, fallbackLocale, type Locale } from '@/i18n/config'
import { isSite, defaultSite, type SiteId } from '@/site/config'
import { t } from '@/i18n/ui'

/**
 * Локализованная 404 внутри layout'а сайта/локали (M0-T19; микрокопия по сайту — бриф §7).
 * not-found.tsx не получает params, поэтому site/locale читаем из заголовков
 * x-site/x-locale, которые proxy.ts ставит при rewrite. Срабатывает и для
 * notFound() из страниц, и для несматченных путей под валидной локалью
 * (например /en/xx/articles) — оба случая отдают настоящий HTTP 404.
 */
export default async function NotFound() {
  const h = await headers()
  const rawLocale = h.get('x-locale') ?? ''
  const rawSite = h.get('x-site') ?? ''
  const locale: Locale = isLocale(rawLocale) ? rawLocale : fallbackLocale
  const site: SiteId = isSite(rawSite) ? rawSite : defaultSite

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="font-mono text-6xl text-muted" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-4xl">{t(locale, 'notFoundTitle')}</h1>
      <p className="mt-4 max-w-xl text-muted">
        {t(locale, site === 'sealrescue' ? 'notFoundBodyRescue' : 'notFoundBodyLife')}
      </p>
      <Link
        href={`/${locale}`}
        className="mt-8 inline-block font-mono text-sm text-link hover:underline"
      >
        {t(locale, 'backHome')}
      </Link>
    </div>
  )
}
