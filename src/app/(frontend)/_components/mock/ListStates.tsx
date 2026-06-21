import type { Locale } from '@/i18n/config'
import type { SiteId } from '@/site/config'
import { m } from '@/mock/copy'

/** Пустое состояние как полноценный UI-блок (DESIGN_BRIEF §4c): тон зависит от сайта. */
export function EmptyState({ site, locale }: { site: SiteId; locale: Locale }) {
  const surface = site === 'sealife' ? 'bg-surface-info' : 'bg-surface'
  return (
    <div className={`rounded-card border border-border ${surface} p-8 text-center text-text`}>
      {m(locale).empty[site]}
    </div>
  )
}

/** Скелет загрузки без сдвига layout (CLS-safe, §14). Совпадает по форме с карточками списка. */
export function ListSkeleton({ locale }: { locale: Locale }) {
  return (
    <>
      <p className="sr-only" role="status">
        {m(locale).loading}
      </p>
      <ul className="card-grid" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface">
              <div className="aspect-[16/10] bg-surface-info opacity-60" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-border" />
                <div className="h-3 w-full rounded bg-border opacity-60" />
                <div className="h-3 w-5/6 rounded bg-border opacity-60" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
