import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'

/**
 * Каркас реальной (не-mock) контентной страницы M1: «← на главную», H1, лид.
 * В отличие от mock SectionShell — без плашки демо-данных.
 */
export function PageShell({
  locale,
  title,
  intro,
  narrow = false,
  children,
}: {
  locale: Locale
  title: string
  intro?: string
  narrow?: boolean
  children: ReactNode
}) {
  return (
    <div className={`mx-auto ${narrow ? 'max-w-3xl' : 'max-w-5xl'} px-5 py-10`}>
      <Link href={`/${locale}`} className="font-mono text-xs text-muted hover:text-link">
        {t(locale, 'backHome')}
      </Link>
      <h1 className="mt-3 text-4xl">{title}</h1>
      {intro && <p className="mt-3 max-w-2xl text-lg text-muted">{intro}</p>}
      {children}
    </div>
  )
}
