import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'

/**
 * «Факт дня» (M1-T03): один факт о тюленях, детерминированно выбранный по дате
 * (см. content/factOfDay.ts). Ссылается на вид-источник, если он известен.
 */
export function FactOfDay({
  locale,
  fact,
  speciesName,
  speciesHref,
}: {
  locale: Locale
  fact: string
  speciesName?: string
  speciesHref?: string
}) {
  return (
    <section className="mt-8 rounded-card border border-border bg-surface-warm p-6">
      <p className="font-mono text-xs uppercase tracking-wide text-muted">{t(locale, 'factOfDay')}</p>
      <p className="mt-2 text-xl">{fact}</p>
      {speciesName &&
        (speciesHref ? (
          <Link href={speciesHref} className="mt-2 inline-block text-sm text-link hover:underline">
            {speciesName}
          </Link>
        ) : (
          <p className="mt-2 text-sm text-muted">{speciesName}</p>
        ))}
    </section>
  )
}
