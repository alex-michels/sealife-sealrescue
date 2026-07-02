import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import { sites } from '@/site/config'
import { t } from '@/i18n/ui'
import { Card } from '../ui/Card'
import { EqualCardGrid } from '../ui/EqualCardGrid'
import { WhiskerDivider } from '../ui/WhiskerDivider'
import { SealMascot } from '../ui/SealMascot'
import { CrossLink } from '../content/CrossLink'
import { sectionsForSite } from '@/site/sections'

/**
 * Главная sealife — медиа-хаб, игривый тон (M0-T08 каркас; полный bento — M1-T05).
 * Лента приходит слотом `feed` (page оборачивает её в <Suspense> со скелетом),
 * чтобы hero и хаб разделов не ждали Payload.
 */
export function SealifeHome({ locale, feed }: { locale: Locale; feed: ReactNode }) {
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
      <h2 className="mb-5 text-2xl">{{ ru: 'Разделы', en: 'Explore', de: 'Entdecken' }[locale]}</h2>
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
      {feed}

      {/* Перелинковка sealife → sealrescue (M1-T04). Тревожный регистр (--critical). */}
      <CrossLink locale={locale} variant="emergency" />
    </div>
  )
}
