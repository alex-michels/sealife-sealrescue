import React from 'react'
import { notFound } from 'next/navigation'
import { siteIds, isSite, sites } from '@/site/config'
import { fontDisplay, fontBody, fontMono } from '@/app/(frontend)/fonts'
import { SiteHeader } from '@/app/(frontend)/_components/SiteHeader'
import { SiteFooter } from '@/app/(frontend)/_components/SiteFooter'
import { Analytics } from '@/app/(frontend)/_components/consent/Analytics'
import '@/app/(frontend)/globals.css'

/**
 * Legal-shell DE (M0-T13). `de` — НЕ контентная локаль: это статический сегмент с
 * фиксированным набором legal-страниц (Impressum/Datenschutz/Cookies/Terms).
 * Контентные `/de/…` маршруты сюда не попадают (страниц нет → 404; proxy не редиректит).
 * Свой root-layout: <html lang="de"> + футер с DE legal-ссылками (без RU/EN-свитчера).
 */
const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC

export function generateStaticParams() {
  return siteIds.map((site) => ({ site }))
}

export default async function DeLegalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ site: string }>
}) {
  const { site } = await params
  if (!isSite(site)) notFound()

  const fontVars = `${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`
  return (
    <html lang="de" data-site={sites[site].id} className={fontVars}>
      <body>
        <SiteHeader site={sites[site].id} lang="de" />
        <main>{children}</main>
        <SiteFooter lang="de" />
        {/* Аналитика только при ранее данном согласии (cookie). Баннер — на контентных
            страницах RU/EN; на legal-DE согласие меняется на /de/cookies. */}
        {PLAUSIBLE_SRC && <Analytics domain={sites[site].domain} src={PLAUSIBLE_SRC} />}
      </body>
    </html>
  )
}
