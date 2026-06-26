import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { sites } from '@/site/config'
import { t } from '@/i18n/ui'
import { Card } from '../ui/Card'
import { EqualCardGrid } from '../ui/EqualCardGrid'
import { WhiskerDivider } from '../ui/WhiskerDivider'
import { SealMascot } from '../ui/SealMascot'
import { CrossLink } from '../content/CrossLink'
import { sectionsForSite } from '@/site/sections'

export type HomeDoc = { id: number | string; slug: string; title: string; type: string }

/** Главная sealife — медиа-хаб, игривый тон (M0-T08 каркас; полный bento — M1-T05). */
export function SealifeHome({ locale, docs }: { locale: Locale; docs: HomeDoc[] }) {
  const site = sites.sealife
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <section className="dapple rounded-card px-6 py-12">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {/* Анимированный маскот рядом с вордмарком (моргает / показывает язык) — только sealife (§5). */}
          <SealMascot size={104} animated className="shrink-0" />
          <div>
            <h1 className="text-5xl">{site.brand[locale]}</h1>
            <p className="mt-4 max-w-2xl text-xl text-muted">{site.tagline[locale]}</p>
          </div>
        </div>
      </section>

      <WhiskerDivider className="my-6" />

      {/* Хаб разделов — главная как точка входа во весь сайт (M0-T19). */}
      <h2 className="mb-5 text-2xl">{locale === 'en' ? 'Explore' : 'Разделы'}</h2>
      <EqualCardGrid>
        {sectionsForSite('sealife').map((s) => (
          <li key={s.slug}>
            <Link href={`/${locale}/${s.slug}`} className="block h-full">
              <Card className="h-full transition-transform hover:-translate-y-0.5">
                <h3 className="text-xl">{s.label[locale]}</h3>
                <p className="mt-2 text-muted">{s.intro[locale]}</p>
              </Card>
            </Link>
          </li>
        ))}
      </EqualCardGrid>

      <WhiskerDivider className="my-8" />

      <h2 className="mb-5 text-2xl">{t(locale, 'latest')}</h2>
      {docs.length === 0 ? (
        // Empty как настоящий UI-блок на info-поверхности (azure-soft), текст тёмный (§4c/§2e).
        <div className="rounded-card bg-surface-info p-6 text-text">{t(locale, 'empty')}</div>
      ) : (
        <EqualCardGrid>
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link href={`/${locale}/${doc.slug}`} className="block h-full">
                <Card className="h-full transition-transform hover:-translate-y-0.5">
                  <span className="font-mono text-xs uppercase tracking-wide text-muted">
                    {doc.type}
                  </span>
                  <h3 className="mt-2 text-xl">{doc.title}</h3>
                </Card>
              </Link>
            </li>
          ))}
        </EqualCardGrid>
      )}

      {/* Перелинковка sealife → sealrescue (M1-T04). Тревожный регистр (--critical). */}
      <CrossLink locale={locale} variant="emergency" />
    </div>
  )
}
