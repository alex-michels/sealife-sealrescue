import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { t } from '@/i18n/ui'
import { CookieControls } from '@/app/(frontend)/_components/consent/CookieControls'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}): Promise<Metadata> {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) return {}
  return {
    title: t(locale as Locale, 'cookiesTitle'),
    alternates: buildAlternates('/cookies', locale as Locale, sites[site]),
  }
}

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}) {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) notFound()

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-4xl">{t(locale, 'cookiesTitle')}</h1>
      <div className="article-body mt-6">
        <p>{t(locale, 'cookiesIntro')}</p>
        <p>{t(locale, 'cookiesPlausible')}</p>
        <p>{t(locale, 'cookiesWithdraw')}</p>
      </div>
      <CookieControls lang={locale} />
    </div>
  )
}
