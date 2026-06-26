import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isSite, sites, siteBaseUrl } from '@/site/config'
import { legalDocs } from '@/site/legal'
import { LegalArticle } from '@/app/(frontend)/_components/legal/LegalArticle'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>
}): Promise<Metadata> {
  const { site } = await params
  if (!isSite(site)) return {}
  return {
    title: legalDocs.terms.de.title,
    alternates: { canonical: `${siteBaseUrl(sites[site])}/de/terms` },
  }
}

export default async function DeTermsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (!isSite(site)) notFound()
  return <LegalArticle doc={legalDocs.terms.de} lang="de" />
}
