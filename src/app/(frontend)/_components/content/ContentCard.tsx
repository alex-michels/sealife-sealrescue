import Link from 'next/link'
import type { Media } from '@/payload-types'
import { Cover } from './Cover'

export interface ContentCardItem {
  href?: string
  title: string
  excerpt?: string
  meta?: string
  seed?: number
  coverImage?: number | Media | null
  mediaLabel?: string
}

function CardInner({ item }: { item: ContentCardItem }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-transform hover:-translate-y-0.5">
      <Cover image={item.coverImage} seed={item.seed ?? 0} label={item.mediaLabel} />
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

/** Карточка списка/каталога M1. С href — ведёт на канонический /[locale]/[slug]; без — статична (галерея мемов). */
export function ContentCard({ item }: { item: ContentCardItem }) {
  if (!item.href) return <CardInner item={item} />
  return (
    <Link href={item.href} className="block h-full">
      <CardInner item={item} />
    </Link>
  )
}
