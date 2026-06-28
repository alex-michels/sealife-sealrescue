import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { sampleCenters } from '@/mock/sample'
import { m } from '@/mock/copy'
import type { CenterStatus } from '@/app/(frontend)/_components/ui/StatusDot'
import {
  requireSection,
  sectionMetadata,
  type RouteParams,
  type SearchParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { SectionShell } from '@/app/(frontend)/_components/mock/SectionShell'
import { EmptyState } from '@/app/(frontend)/_components/mock/ListStates'
import { CenterCard } from '@/app/(frontend)/_components/mock/CenterCard'
import { MapToggle } from '@/app/(frontend)/_components/mock/MapToggle'
import { cx } from '@/app/(frontend)/_components/ui/cx'

const SLUG = 'rescue-centers'

type FilterKey = 'all' | CenterStatus
const FILTERS: Array<{ key: FilterKey; label: Record<Locale, string> }> = [
  { key: 'all', label: { ru: 'Все', en: 'All', de: 'Alle' } },
  { key: 'active', label: { ru: 'Активны', en: 'Active', de: 'Aktiv' } },
  { key: 'needs_check', label: { ru: 'Проверить', en: 'Needs check', de: 'Prüfen' } },
  { key: 'link_broken', label: { ru: 'Ссылка', en: 'Link broken', de: 'Link' } },
  { key: 'unconfirmed', label: { ru: 'Не подтв.', en: 'Unconfirmed', de: 'Unbest.' } },
]

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function RescueCentersPage({
  params,
  searchParams,
}: {
  params: RouteParams
  searchParams: SearchParams
}) {
  const { locale, section } = await requireSection(params, SLUG)
  const sp = await searchParams
  const active: FilterKey =
    typeof sp.status === 'string' && FILTERS.some((f) => f.key === sp.status)
      ? (sp.status as FilterKey)
      : 'all'
  const c = m(locale)
  const countFor = (key: FilterKey) =>
    key === 'all' ? sampleCenters.length : sampleCenters.filter((x) => x.status === key).length
  const filtered = active === 'all' ? sampleCenters : sampleCenters.filter((x) => x.status === active)

  return (
    <SectionShell locale={locale} title={section.title[locale]} intro={section.intro[locale]}>
      {/* Фильтр-чипы с числом результатов; активный фильтр виден; «Все» = сброс (§7). */}
      <div className="mb-4">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">{c.filters}</p>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const href = f.key === 'all' ? `/${locale}/${SLUG}` : `/${locale}/${SLUG}?status=${f.key}`
            const isActive = f.key === active
            return (
              <Link
                key={f.key}
                href={href}
                aria-current={isActive ? 'true' : undefined}
                className={cx(
                  'inline-flex min-h-8 items-center gap-1.5 rounded-btn border px-3 py-1 text-sm',
                  isActive
                    ? 'border-border-cool bg-surface-info text-text'
                    : 'border-border text-muted hover:text-text',
                )}
              >
                {f.label[locale]} <span className="font-mono text-xs">{countFor(f.key)}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted">{c.resultsCount(filtered.length)}</p>

      <MapToggle locale={locale} />

      {filtered.length === 0 ? (
        <EmptyState site="sealrescue" locale={locale} />
      ) : (
        <ul className="space-y-4">
          {filtered.map((center) => (
            <CenterCard
              key={center.slug}
              center={center}
              locale={locale}
              detailHref={`/${locale}/${SLUG}/${center.slug}`}
            />
          ))}
        </ul>
      )}
    </SectionShell>
  )
}
