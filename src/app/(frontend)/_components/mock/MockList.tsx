import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import type { SiteId } from '@/site/config'
import { m } from '@/mock/copy'
import { buttonClasses } from '../ui/Button'
import { EqualCardGrid } from '../ui/EqualCardGrid'
import { PlaceholderMedia } from './PlaceholderMedia'
import { EmptyState, ListSkeleton } from './ListStates'
import { ErrorBlock } from './ErrorBlock'
import type { MockState } from './StateSwitcher'

export interface SampleCardItem {
  href?: string
  title: string
  excerpt?: string
  meta?: string
  seed?: number
  mediaLabel?: string
}

function CardInner({ item }: { item: SampleCardItem }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-transform hover:-translate-y-0.5">
      <PlaceholderMedia seed={item.seed ?? 0} label={item.mediaLabel} />
      <div className="flex flex-1 flex-col p-4">
        {item.meta && (
          <span className="font-mono text-xs uppercase tracking-wide text-muted">{item.meta}</span>
        )}
        <h3 className="mt-1 text-xl">{item.title}</h3>
        {item.excerpt && <p className="mt-2 text-muted">{item.excerpt}</p>}
      </div>
    </div>
  )
}

export function SampleCardGrid({ items }: { items: SampleCardItem[] }) {
  return (
    <EqualCardGrid>
      {items.map((item, i) => (
        <li key={item.href ?? i}>
          {item.href ? (
            <Link href={item.href} className="block h-full">
              <CardInner item={item} />
            </Link>
          ) : (
            <CardInner item={item} />
          )}
        </li>
      ))}
    </EqualCardGrid>
  )
}

/**
 * Диспетчер состояний списка (M0-T19): populated / empty / loading / error.
 * Демо-`error` рендерит тот же ErrorBlock, что и реальная error.tsx-граница (в dev
 * настоящий throw показал бы оверлей Next, а не дизайн) — «повтор» ведёт на populated.
 */
export function MockList({
  site,
  locale,
  state,
  items,
  basePath,
}: {
  site: SiteId
  locale: Locale
  state: MockState
  items: SampleCardItem[]
  basePath: string
}) {
  if (state === 'error')
    return (
      <ErrorBlock
        site={site}
        locale={locale}
        action={
          <Link href={basePath} className={buttonClasses('primary', 'md')}>
            {m(locale).retry}
          </Link>
        }
      />
    )
  if (state === 'loading') return <ListSkeleton locale={locale} />
  if (state === 'empty' || items.length === 0) return <EmptyState site={site} locale={locale} />
  return <SampleCardGrid items={items} />
}
