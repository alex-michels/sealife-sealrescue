import React from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { locales, isLocale, type Locale } from '@/i18n/config'
import { siteIds, isSite, sites } from '@/site/config'
import { fontDisplay, fontBody, fontMono } from '@/app/(frontend)/fonts'
import '@/app/(frontend)/globals.css'

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

  // lang — по локали (WCAG/EAA + SEO). data-theme — режим дизайна по сайту (M0-T08).
  const fontVars = `${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`
  return (
    <html lang={locale} data-theme={sites[site].theme} className={fontVars}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
