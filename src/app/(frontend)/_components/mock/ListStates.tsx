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
