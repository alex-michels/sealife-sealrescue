import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { SealifeHome } from '@/app/(frontend)/_components/home/SealifeHome'
import { SealrescueHome } from '@/app/(frontend)/_components/home/SealrescueHome'
import { LatestFeed } from '@/app/(frontend)/_components/home/LatestFeed'
import { CardGridSkeleton } from '@/app/(frontend)/_components/ui/CardGridSkeleton'
import { sectionCardsForSite } from '@/site/sectionContent'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}): Promise<Metadata> {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) return {}
  const s = sites[site]
  return {
    title: { absolute: s.brand[locale as Locale] },
    description: s.tagline[locale as Locale],
    alternates: buildAlternates('', locale as Locale, s),
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}) {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) notFound()

  if (site === 'sealrescue') return <SealrescueHome locale={locale as Locale} />

  // sealife: hero/хаб отдаются сразу, лента Payload стримится в <Suspense>
  // (M0-T19: loading-граница только у ленты, страница целиком не soft-404-ится).
  // Карточки хаба — разделы из кода + admin-overrides (M1-T27: intro/cover из админки).
  const sections = await sectionCardsForSite('sealife', locale as Locale)
  return (
    <SealifeHome
      locale={locale as Locale}
      sections={sections}
      feed={
        <Suspense fallback={<CardGridSkeleton />}>
          <LatestFeed locale={locale as Locale} />
        </Suspense>
      }
    />
  )
}
