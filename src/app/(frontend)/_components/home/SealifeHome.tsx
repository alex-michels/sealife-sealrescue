import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { sites } from '@/site/config'
import { t } from '@/i18n/ui'
import { LocaleSwitcher } from '../LocaleSwitcher'
import { Card } from '../ui/Card'
import { WhiskerDivider } from '../ui/WhiskerDivider'
import { buttonClasses } from '../ui/Button'

export type HomeDoc = { id: number | string; slug: string; title: string; type: string }

/** Главная sealife — медиа-хаб, игривый тон (M0-T08 каркас; полный bento — M1-T05). */
export function SealifeHome({ locale, docs }: { locale: Locale; docs: HomeDoc[] }) {
  const site = sites.sealife
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex items-center justify-between gap-4">
        <span className="font-mono text-sm text-muted">🦭 {site.domain}</span>
        <LocaleSwitcher locale={locale} pathSuffix="" />
      </header>

      <section className="py-12">
        <h1 className="text-5xl text-primary">{site.brand[locale]}</h1>
        <p className="mt-4 max-w-xl text-xl text-muted">{site.tagline[locale]}</p>
      </section>

      <WhiskerDivider className="my-6" />

      <h2 className="mb-5 text-2xl">{t(locale, 'latest')}</h2>
      {docs.length === 0 ? (
        <p className="text-muted">{t(locale, 'empty')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link href={`/${locale}/${doc.slug}`} className="block">
                <Card className="h-full transition-transform hover:-translate-y-0.5">
                  <span className="font-mono text-xs uppercase tracking-wide text-muted">
                    {doc.type}
                  </span>
                  <h3 className="mt-2 text-xl">{doc.title}</h3>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Перелинковка sealife → sealrescue. Единственный акцентный CTA на странице. */}
      <Card className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg">{t(locale, 'crossRescue')}</p>
        <a href="https://sealrescue.info" className={buttonClasses('accent', 'lg', 'shrink-0')}>
          {t(locale, 'crossRescueCta')}
        </a>
      </Card>
    </div>
  )
}
