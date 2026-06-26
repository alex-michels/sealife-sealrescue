import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { EqualCardGrid } from '../ui/EqualCardGrid'
import { ContentCard, type ContentCardItem } from './ContentCard'

/**
 * Список/каталог опубликованного контента (M1-T02). Пустое состояние — полноценный
 * UI-блок (DESIGN_BRIEF §4c), на sealife — info-поверхность с тёмным текстом.
 */
export function ContentList({ locale, items }: { locale: Locale; items: ContentCardItem[] }) {
  if (items.length === 0) {
    return <div className="mt-8 rounded-card border border-border bg-surface-info p-8 text-center text-text">{t(locale, 'empty')}</div>
  }
  return (
    <EqualCardGrid className="mt-8">
      {items.map((item, i) => (
        <li key={item.href ?? i}>
          <ContentCard item={item} />
        </li>
      ))}
    </EqualCardGrid>
  )
}
