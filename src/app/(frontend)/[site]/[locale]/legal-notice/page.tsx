import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { legalDocs } from '@/site/legal'
import { LegalArticle } from '@/app/(frontend)/_components/legal/LegalArticle'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}): Promise<Metadata> {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) return {}
  return {
    title: legalDocs.legalNotice[locale as Locale].title,
    alternates: buildAlternates('/legal-notice', locale as Locale, sites[site]),
  }
}

export default async function LegalNoticePage({
  params,
}: {
  params: Promise<{ site: string; locale: string }>
}) {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) notFound()
  return <LegalArticle doc={legalDocs.legalNotice[locale as Locale]} lang={locale as Locale} />
}
