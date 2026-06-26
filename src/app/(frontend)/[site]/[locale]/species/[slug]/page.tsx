import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { RichText } from '@payloadcms/richtext-lexical/react'

import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { t } from '@/i18n/ui'
import { getSection } from '@/site/sections'
import { findSpeciesBySlug } from '@/app/(frontend)/_components/content/getSpecies'
import { Cover } from '@/app/(frontend)/_components/content/Cover'
import { AiBadge } from '@/app/(frontend)/_components/content/AiBadge'
import { CrossLink } from '@/app/(frontend)/_components/content/CrossLink'

type SlugParams = Promise<{ site: string; locale: string; slug: string }>
const SLUG = 'species'

// Подписи охранного статуса IUCN (значения хранятся как коды, локализуем в UI).
const conservationLabels: Record<string, Record<Locale, string>> = {
  LC: { ru: 'Наименьшие опасения (LC)', en: 'Least concern (LC)' },
  NT: { ru: 'Близок к уязвимому (NT)', en: 'Near threatened (NT)' },
  VU: { ru: 'Уязвимый (VU)', en: 'Vulnerable (VU)' },
  EN: { ru: 'Вымирающий (EN)', en: 'Endangered (EN)' },
  CR: { ru: 'На грани исчезновения (CR)', en: 'Critically endangered (CR)' },
  DD: { ru: 'Недостаточно данных (DD)', en: 'Data deficient (DD)' },
}

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale) || !getSection(site, SLUG)) return {}
  const sp = await findSpeciesBySlug(locale, slug)
  if (!sp) return {}
  return {
    title: sp.name,
    description: sp.excerpt || undefined,
    alternates: buildAlternates(`/${SLUG}/${slug}`, locale, sites[site]),
  }
}

export default async function SpeciesDetail({ params }: { params: SlugParams }) {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale) || !getSection(site, SLUG)) notFound()

  const sp = await findSpeciesBySlug(locale, slug)
  if (!sp) notFound()

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href={`/${locale}/${SLUG}`} className="font-mono text-xs text-muted hover:text-link">
        ← {getSection(site, SLUG)!.title[locale]}
      </Link>
      <article>
        <span className="mt-3 block font-mono text-xs italic text-muted">{sp.latin}</span>
        <h1 className="mt-1 text-4xl">{sp.name}</h1>
        {sp.aiGenerated && <AiBadge locale={locale} />}
        <Cover image={sp.coverImage} seed={5} className="mt-6 rounded-card" />

        {sp.excerpt && <p className="mt-6 text-xl text-muted">{sp.excerpt}</p>}

        <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
          {sp.region && (
            <div>
              <dt className="font-mono text-xs uppercase tracking-wide text-muted">
                {t(locale, 'speciesRange')}
              </dt>
              <dd className="mt-1">{sp.region}</dd>
            </div>
          )}
          {sp.size && (
            <div>
              <dt className="font-mono text-xs uppercase tracking-wide text-muted">
                {t(locale, 'speciesLength')}
              </dt>
              <dd className="mt-1">{sp.size}</dd>
            </div>
          )}
          {sp.conservationStatus && (
            <div>
              <dt className="font-mono text-xs uppercase tracking-wide text-muted">
                {t(locale, 'speciesConservation')}
              </dt>
              <dd className="mt-1">{conservationLabels[sp.conservationStatus][locale]}</dd>
            </div>
          )}
        </dl>

        {sp.body && (
          <div className="article-body mt-8">
            <RichText data={sp.body} />
          </div>
        )}

        {!!sp.facts?.length && (
          <ul className="mt-6 list-disc space-y-1 pl-5 text-muted">
            {sp.facts.map((f, i) => (
              <li key={f.id ?? i}>{f.text}</li>
            ))}
          </ul>
        )}

        <CrossLink locale={locale} variant="curious" />
      </article>
    </div>
  )
}
