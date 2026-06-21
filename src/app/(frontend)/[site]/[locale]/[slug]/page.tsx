import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'

import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { t } from '@/i18n/ui'
import { LanguageSwitcher } from '@/app/(frontend)/_components/LanguageSwitcher'

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

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 flex justify-end">
        <LanguageSwitcher current={locale} />
      </div>

      <article>
        <span className="font-mono text-xs uppercase tracking-wide text-muted">{doc.type}</span>
        <h1 className="mt-2 text-4xl text-primary">{doc.title}</h1>

        {/* EU AI Act: маркировка AI-сгенерированного/переведённого контента. */}
        {doc.aiGenerated && (
          <p className="mt-4 inline-block rounded-btn bg-surface px-3 py-1 font-mono text-xs text-muted">
            ⚙ {t(locale, 'aiGenerated')}
          </p>
        )}

        {doc.body && (
          <div className="article-body mt-8">
            <RichText data={doc.body} />
          </div>
        )}
      </article>
    </div>
  )
}
