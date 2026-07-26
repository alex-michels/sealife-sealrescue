import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { chromeLocale, isRouteLocale, type RouteLocale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildLegalAlternates } from '@/i18n/alternates'
import { t } from '@/i18n/ui'
import { CookieControls } from '@/app/(frontend)/_components/consent/CookieControls'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}): Promise<Metadata> {
  const { site, locale } = await params
  if (!isSite(site) || !isRouteLocale(locale)) return {}
  return {
    title: t(chromeLocale(locale as RouteLocale), 'cookiesTitle'),
    alternates: buildLegalAlternates('/cookies', locale as RouteLocale, sites[site]),
  }
}

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}) {
  const { site, locale } = await params
  if (!isSite(site) || !isRouteLocale(locale)) notFound()

  // Немецких UI-строк больше нет: на legal-only локали (/de) страница отдаётся на фолбэке (en).
  // Немецкими остаются только сами юр. документы в `legalDocs` (Impressum/Datenschutz/Terms).
  const ui = chromeLocale(locale)

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-4xl">{t(ui, 'cookiesTitle')}</h1>
      <div className="article-body mt-6">
        <p>{t(ui, 'cookiesIntro')}</p>
        <p>{t(ui, 'cookiesPlausible')}</p>
        <p>{t(ui, 'cookiesWithdraw')}</p>
      </div>
      <CookieControls lang={ui} />
    </div>
  )
}
