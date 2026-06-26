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
    title: legalDocs.privacy.de.title,
    alternates: { canonical: `${siteBaseUrl(sites[site])}/de/datenschutz` },
  }
}

export default async function DatenschutzPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params
  if (!isSite(site)) notFound()
  return <LegalArticle doc={legalDocs.privacy.de} lang="de" />
}
