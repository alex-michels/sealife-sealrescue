import React from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { routeLocales, isRouteLocale, chromeLocale } from '@/i18n/config'
import { siteIds, isSite, sites } from '@/site/config'
import { fontDisplay, fontBody, fontMono } from '@/app/(frontend)/fonts'
import { SiteHeader } from '@/app/(frontend)/_components/SiteHeader'
import { SiteFooter } from '@/app/(frontend)/_components/SiteFooter'
import { metadataBaseFor, iconsFor, socialMetadata } from '@/site/social'
import { PreviewBanner } from '@/app/(frontend)/_components/PreviewBanner'
import { Analytics } from '@/app/(frontend)/_components/consent/Analytics'
import { ConsentBanner } from '@/app/(frontend)/_components/consent/ConsentBanner'
import '@/app/(frontend)/globals.css'

// Аналитика + баннер согласия включаются только если задан скрипт Plausible.
const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC

// Пререндерим все комбинации сайт × локаль (главная, styleguide статичны).
// routeLocales, а не locales: под /de живут только legal-страницы (немецкий Impressum),
// но layout обслуживает и их.
export function generateStaticParams() {
  return siteIds.flatMap((site) => routeLocales.map((locale) => ({ site, locale })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}): Promise<Metadata> {
  const { site, locale } = await params
  if (!isSite(site) || !isRouteLocale(locale)) return {}
  const chrome = chromeLocale(locale)
  const brand = sites[site].brand[chrome]
  return {
    title: { default: brand, template: `%s · ${brand}` },
    // CR-10: база для относительных URL в метаданных + иконки (у двух сайтов они РАЗНЫЕ,
    // поэтому файловый favicon.ico в корне не подошёл бы — он один на приложение).
    metadataBase: metadataBaseFor(site),
    icons: iconsFor(site),
    // Дефолт сайта. Страницы, которым есть что сказать точнее, зовут socialMetadata() сами —
    // и обязаны отдать ПОЛНЫЙ openGraph, потому что Next замещает его, а не дополняет.
    ...socialMetadata({ site, locale, title: brand, path: '' }),
  }
}

export default async function SiteLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ site: string; locale: string }>
}) {
  const { site, locale } = await params
  if (!isSite(site) || !isRouteLocale(locale)) notFound()

  // На legal-only локали (de — немецкий Impressum) контента и UI-строк нет: сам текст страницы
  // немецкий, а обвязка сайта рендерится на фолбэке (en).
  const chrome = chromeLocale(locale)

  // lang — по локали (WCAG/EAA + SEO). data-site — режим дизайна по сайту (DESIGN_BRIEF §2c, M0-T08).
  const fontVars = `${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`
  return (
    <html lang={locale} data-site={sites[site].id} className={fontVars}>
      <body>
        {/* CR-08: виден только в draft-режиме, иначе не рендерится вовсе. */}
        <PreviewBanner locale={locale} />
        <SiteHeader site={sites[site].id} lang={locale} />
        <main>{children}</main>
        <SiteFooter lang={locale} />
        {PLAUSIBLE_SRC && (
          <>
            {/* Plausible грузится только после согласия (M0-T11/T12). */}
            <Analytics domain={sites[site].domain} src={PLAUSIBLE_SRC} />
            <ConsentBanner locale={chrome} />
          </>
        )}
      </body>
    </html>
  )
}
