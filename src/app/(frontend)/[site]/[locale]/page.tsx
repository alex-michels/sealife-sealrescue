import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { SealifeHome } from '@/app/(frontend)/_components/home/SealifeHome'
import { SealrescueHome } from '@/app/(frontend)/_components/home/SealrescueHome'
import { LatestFeed } from '@/app/(frontend)/_components/home/LatestFeed'
import { JsonLd } from '@/app/(frontend)/_components/JsonLd'
import { websiteJsonLd } from '@/site/jsonLd'
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

  // M1-T16: издание целиком — на главной обоих сайтов.
  const siteJsonLd = <JsonLd data={websiteJsonLd(site, locale as Locale)} />

  if (site === 'sealrescue') {
    // CR-11: тот же источник, что у sealife — разделы из кода + overrides из админки.
    const rescueSections = await sectionCardsForSite('sealrescue', locale as Locale)
    return (
      <>
        {siteJsonLd}
        <SealrescueHome locale={locale as Locale} sections={rescueSections} />
      </>
    )
  }

  // sealife: hero/хаб отдаются сразу, лента Payload стримится в <Suspense>
  // (M0-T19: loading-граница только у ленты, страница целиком не soft-404-ится).
  // Карточки хаба — разделы из кода + admin-overrides (M1-T27: intro/cover из админки).
  const sections = await sectionCardsForSite('sealife', locale as Locale)
  return (
    <>
      {siteJsonLd}
      <SealifeHome
        locale={locale as Locale}
        sections={sections}
        feed={
          <Suspense fallback={<CardGridSkeleton />}>
            <LatestFeed locale={locale as Locale} />
          </Suspense>
        }
      />
    </>
  )
}
