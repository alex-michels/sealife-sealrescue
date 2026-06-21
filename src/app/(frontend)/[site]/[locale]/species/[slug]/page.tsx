import { notFound } from 'next/navigation'
import { findSpecies } from '@/mock/sample'
import {
  requireDetail,
  detailMetadata,
  type SlugParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { SampleDetail } from '@/app/(frontend)/_components/mock/SampleDetail'

const SLUG = 'species'

export function generateMetadata({ params }: { params: SlugParams }) {
  return detailMetadata(params, SLUG, (locale, slug) => findSpecies(slug)?.name[locale])
}

export default async function SpeciesDetail({ params }: { params: SlugParams }) {
  const { locale, slug, section } = await requireDetail(params, SLUG)
  const sp = findSpecies(slug)
  if (!sp) notFound()
  return (
    <SampleDetail
      locale={locale}
      backHref={`/${locale}/${SLUG}`}
      backLabel={section.title[locale]}
      meta={sp.latin}
      title={sp.name[locale]}
      seed={5}
      body={[sp.excerpt[locale]]}
    >
      <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="font-mono text-xs uppercase tracking-wide text-muted">
            {locale === 'en' ? 'Range' : 'Ареал'}
          </dt>
          <dd className="mt-1">{sp.region[locale]}</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-wide text-muted">
            {locale === 'en' ? 'Length' : 'Длина'}
          </dt>
          <dd className="mt-1">{sp.size}</dd>
        </div>
      </dl>
      <ul className="mt-6 list-disc space-y-1 pl-5 text-muted">
        {sp.facts.map((f, i) => (
          <li key={i}>{f[locale]}</li>
        ))}
      </ul>
    </SampleDetail>
  )
}
