import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { m } from '@/mock/copy'
import { MockBanner } from './MockBanner'

/**
 * Каркас страницы раздела: «← на главную», H1, лид, плашка демо-данных, контент.
 *
 * `demo` управляет плашкой. По умолчанию `true` — раздел показывает моки. Но плашка вешалась
 * БЕЗУСЛОВНО, и из-за этого настоящие спасательные инструкции («нашёл тюленя») публиковались
 * с подписью «демо-данные». Помечать реальные указания по безопасности выдумкой опаснее, чем
 * не показывать их вовсе, поэтому страницы с настоящим содержимым передают `demo={false}`
 * (аудит 2026-07-26, трек BIO). Плашка остаётся там, где данные и правда фальшивые —
 * прежде всего каталог центров до M2-T02.
 */
export function SectionShell({
  locale,
  title,
  intro,
  narrow = false,
  demo = true,
  children,
}: {
  locale: Locale
  title: string
  intro?: string
  narrow?: boolean
  demo?: boolean
  children: ReactNode
}) {
  return (
    <div className={`mx-auto ${narrow ? 'max-w-3xl' : 'max-w-5xl'} px-5 py-10`}>
      <Link href={`/${locale}`} className="font-mono text-xs text-muted hover:text-link">
        {m(locale).backHome}
      </Link>
      <h1 className="mt-3 text-4xl">{title}</h1>
      {intro && <p className="mt-3 max-w-2xl text-lg text-muted">{intro}</p>}
      {demo && <MockBanner locale={locale} />}
      {children}
    </div>
  )
}
