import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Metadata } from 'next'

import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { ContentDetail } from '@/app/(frontend)/_components/content/ContentDetail'

async function getDoc(locale: Locale, slug: string) {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'content',
    locale,
    where: {
      slug: { equals: slug },
      _status: { equals: 'published' },
    },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; locale: string; slug: string }>
}): Promise<Metadata> {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale)) return {}

  const doc = await getDoc(locale, slug)
  if (!doc) return {}

  return {
    title: doc.seo?.metaTitle || doc.title,
    description: doc.seo?.metaDescription || doc.excerpt || undefined,
    alternates: buildAlternates(`/${slug}`, locale, sites[site]),
  }
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ site: string; locale: string; slug: string }>
}) {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale)) notFound()

  const doc = await getDoc(locale, slug)
  if (!doc) notFound()

  return <ContentDetail doc={doc} locale={locale} />
}
