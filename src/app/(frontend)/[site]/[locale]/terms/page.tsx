import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isRouteLocale, type RouteLocale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildLegalAlternates } from '@/i18n/alternates'
import { legalDocs } from '@/site/legal'
import { LegalArticle } from '@/app/(frontend)/_components/legal/LegalArticle'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}): Promise<Metadata> {
  const { site, locale } = await params
  if (!isSite(site) || !isRouteLocale(locale)) return {}
  return {
    title: legalDocs.terms[locale as RouteLocale].title,
    alternates: buildLegalAlternates('/terms', locale as RouteLocale, sites[site]),
  }
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}) {
  const { site, locale } = await params
  if (!isSite(site) || !isRouteLocale(locale)) notFound()
  return <LegalArticle doc={legalDocs.terms[locale as RouteLocale]} lang={locale as RouteLocale} />
}
