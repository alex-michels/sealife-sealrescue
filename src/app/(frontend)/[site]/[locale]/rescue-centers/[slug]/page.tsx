import { notFound } from 'next/navigation'
import Link from 'next/link'
import { findCenter } from '@/mock/sample'
import { m } from '@/mock/copy'
import {
  requireDetail,
  detailMetadata,
  type SlugParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { MockBanner } from '@/app/(frontend)/_components/mock/MockBanner'
import { StatusDot } from '@/app/(frontend)/_components/ui/StatusDot'
import { VerificationStamp } from '@/app/(frontend)/_components/ui/VerificationStamp'
import { buttonClasses } from '@/app/(frontend)/_components/ui/Button'

const SLUG = 'rescue-centers'

export function generateMetadata({ params }: { params: SlugParams }) {
  return detailMetadata(params, SLUG, (_locale, slug) => findCenter(slug)?.name)
}

export default async function CenterDetail({ params }: { params: SlugParams }) {
  const { locale, slug, section } = await requireDetail(params, SLUG)
  const center = findCenter(slug)
  if (!center) notFound()
  const c = m(locale)
  const tel = `tel:${center.phone.replace(/\s+/g, '')}`
  const mapHref = `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${center.city} ${center.country}`)}`

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href={`/${locale}/${SLUG}`} className="font-mono text-xs text-muted hover:text-link">
        ← {section.title[locale]}
      </Link>
      <MockBanner locale={locale} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-4xl">{center.name}</h1>
        <StatusDot status={center.status} locale={locale} showLabel />
      </div>
      <p className="mt-2 text-muted">
        {center.city} · {center.country}
      </p>

      <p className="mt-4">{center.summary[locale]}</p>

      <div className="mt-6">
        <VerificationStamp
          locale={locale}
          status={center.status}
          agentCheckedAt={center.agentCheckedAt}
          humanReviewedAt={center.humanReviewedAt}
        />
      </div>

      <p className="mt-6 text-sm text-muted">{c.distanceUnknown}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <a href={tel} className={buttonClasses('primary', 'md')}>
          {c.call}
        </a>
        <a href={center.website} target="_blank" rel="noopener noreferrer" className={buttonClasses('ghost', 'md')}>
          {c.website}
        </a>
        <a href={mapHref} target="_blank" rel="noopener noreferrer" className={buttonClasses('ghost', 'md')}>
          {c.route}
        </a>
        <Link href={`/${locale}/report`} className={buttonClasses('ghost', 'md')}>
          {c.reportIssue}
        </Link>
      </div>
    </div>
  )
}
