import React from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { locales, isLocale, type Locale } from '@/i18n/config'
import { siteIds, isSite, sites } from '@/site/config'
import { fontDisplay, fontBody, fontMono } from '@/app/(frontend)/fonts'
import { SiteFooter } from '@/app/(frontend)/_components/SiteFooter'
import { Analytics } from '@/app/(frontend)/_components/consent/Analytics'
import { ConsentBanner } from '@/app/(frontend)/_components/consent/ConsentBanner'
import '@/app/(frontend)/globals.css'

// Аналитика + баннер согласия включаются только если задан скрипт Plausible.
const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC

// Пререндерим все комбинации сайт × локаль (главная, styleguide статичны).
export function generateStaticParams() {
  return siteIds.flatMap((site) => locales.map((locale) => ({ site, locale })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}): Promise<Metadata> {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) return {}
  const brand = sites[site].brand[locale as Locale]
  return { title: { default: brand, template: `%s · ${brand}` } }
}

export default async function SiteLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ site: string; locale: string }>
}) {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) notFound()

  // lang — по локали (WCAG/EAA + SEO). data-site — режим дизайна по сайту (DESIGN_BRIEF §2c, M0-T08).
  const fontVars = `${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`
  return (
    <html lang={locale} data-site={sites[site].id} className={fontVars}>
      <body>
        <main>{children}</main>
        <SiteFooter locale={locale} />
        {PLAUSIBLE_SRC && (
          <>
            {/* Plausible грузится только после согласия (M0-T11/T12). */}
            <Analytics domain={sites[site].domain} src={PLAUSIBLE_SRC} />
            <ConsentBanner locale={locale} />
          </>
        )}
      </body>
    </html>
  )
}
