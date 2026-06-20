import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Metadata } from 'next'

import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { SealifeHome } from '@/app/(frontend)/_components/home/SealifeHome'
import { SealrescueHome } from '@/app/(frontend)/_components/home/SealrescueHome'

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

  // sealife: лента опубликованного контента в активной локали.
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'content',
    locale: locale as Locale,
    where: { _status: { equals: 'published' } },
    sort: '-updatedAt',
    limit: 20,
    depth: 0,
  })

  return (
    <SealifeHome
      locale={locale as Locale}
      docs={docs.map((d) => ({ id: d.id, slug: d.slug, title: d.title, type: d.type }))}
    />
  )
}
