import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { MockBanner } from './MockBanner'
import { PlaceholderMedia } from './PlaceholderMedia'

/** Универсальная mock-страница детали (статья/новость/вид/квиз/игра): «← назад», мета, тело, extras. */
export function SampleDetail({
  locale,
  backHref,
  backLabel,
  meta,
  title,
  date,
  aiAssisted = false,
  seed = 0,
  body,
  children,
}: {
  locale: Locale
  backHref: string
  backLabel: string
  meta?: string
  title: string
  date?: string
  aiAssisted?: boolean
  seed?: number
  body?: string[]
  children?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href={backHref} className="font-mono text-xs text-muted hover:text-link">
        ← {backLabel}
      </Link>
      <MockBanner locale={locale} />
      <article>
        {meta && <span className="font-mono text-xs uppercase tracking-wide text-muted">{meta}</span>}
        <h1 className="mt-2 text-4xl">{title}</h1>
        {date && <p className="mt-2 font-mono text-xs text-muted">{date}</p>}
        {aiAssisted && (
          <p className="mt-4 inline-block rounded-btn bg-surface px-3 py-1 font-mono text-xs text-muted">
            ⚙ {t(locale, 'aiGenerated')}
          </p>
        )}
        <PlaceholderMedia seed={seed} className="mt-6 rounded-card" />
        {body && (
          <div className="article-body mt-8">
            {body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
        {children}
      </article>
    </div>
  )
}
