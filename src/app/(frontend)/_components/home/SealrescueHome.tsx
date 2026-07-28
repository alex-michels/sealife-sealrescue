import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { Card } from '../ui/Card'
import { EqualCardGrid } from '../ui/EqualCardGrid'
import { buttonClasses } from '../ui/Button'
import type { ResolvedSection } from '@/site/sectionContent'
import { Cover } from '../content/Cover'

/**
 * Главная sealrescue — emergency decision-interface (DESIGN_BRIEF §5), серьёзный тон.
 * Первый экран = сценарий «что делать», а не баннер. Дистанция НЕ хардкодится (§6).
 * M0-T08 каркас; полный локатор центров — M2-T01/T02.
 */
const STEP_KEYS = ['rescueStep1', 'rescueStep2', 'rescueStep3', 'rescueStep4'] as const

export function SealrescueHome({
  locale,
  sections,
}: {
  locale: Locale
  /**
   * CR-11: разделы приходят УЖЕ с admin-overrides (M1-T27). Раньше компонент читал
   * `sectionsForSite()` напрямую, и правка интро в админке меняла страницу раздела, но не
   * главную — без единого намёка почему. Главная sealife получала их правильно, sealrescue нет.
   */
  sections: ResolvedSection[]
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      {/* Герой = сценарий действий. Один акцентный CTA (--critical/buoy-dark). */}
      <section className="py-12">
        <h1 className="text-4xl text-primary">{t(locale, 'rescueHeadline')}</h1>
        <ol className="mt-6 space-y-2">
          {STEP_KEYS.map((key, i) => (
            <li key={key} className="flex gap-3">
              <span className="font-mono text-sm text-muted">{i + 1}.</span>
              <span>{t(locale, key)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">{t(locale, 'rescueDistance')}</p>
        <Link href={`/${locale}/rescue-centers`} className={buttonClasses('critical', 'lg', 'mt-8')}>
          {t(locale, 'rescueCta')}
        </Link>
      </section>

      {/* Хаб разделов спасения — вход во весь sealrescue (M0-T19). */}
      <section>
        <h2 className="mb-4 text-2xl">{{ ru: 'Разделы', en: 'Sections', de: 'Bereiche' }[locale]}</h2>
        <EqualCardGrid>
          {sections.map((s) => (
            <li key={s.slug}>
              <Link href={`/${locale}/${s.slug}`} className="block h-full">
                <Card className="h-full transition-transform hover:-translate-y-0.5">
                  {s.cover && <Cover image={s.cover} className="-mx-6 -mt-6 mb-4" />}
                  <h3 className="text-xl">{s.label[locale]}</h3>
                  <p className="mt-2 text-muted">{s.intro[locale]}</p>
                </Card>
              </Link>
            </li>
          ))}
        </EqualCardGrid>
      </section>

      {/* Перелинковка sealrescue → sealife. */}
      <div className="mt-12 flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg">{t(locale, 'crossLife')}</p>
        <a href="https://sealife.info" className={buttonClasses('ghost', 'md', 'shrink-0')}>
          {t(locale, 'crossLifeCta')}
        </a>
      </div>
    </div>
  )
}
