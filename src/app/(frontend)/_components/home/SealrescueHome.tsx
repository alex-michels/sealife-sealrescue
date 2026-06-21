import type { Locale } from '@/i18n/config'
import { sites } from '@/site/config'
import { t } from '@/i18n/ui'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { Card } from '../ui/Card'
import { buttonClasses } from '../ui/Button'

/**
 * Главная sealrescue — emergency decision-interface (DESIGN_BRIEF §5), серьёзный тон.
 * Первый экран = сценарий «что делать», а не баннер. Дистанция НЕ хардкодится (§6).
 * M0-T08 каркас; полный локатор центров — M2-T01/T02.
 */
const STEP_KEYS = ['rescueStep1', 'rescueStep2', 'rescueStep3', 'rescueStep4'] as const

export function SealrescueHome({ locale }: { locale: Locale }) {
  const site = sites.sealrescue
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex items-center justify-between gap-4">
        <span className="font-mono text-sm text-muted">{site.domain}</span>
        <LanguageSwitcher current={locale} />
      </header>

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
        <a href="#centers" className={buttonClasses('critical', 'lg', 'mt-8')}>
          {t(locale, 'rescueCta')}
        </a>
      </section>

      <section id="centers" className="scroll-mt-6">
        <h2 className="mb-4 text-2xl">{t(locale, 'centersTitle')}</h2>
        <Card>
          <p className="text-muted">{t(locale, 'centersSoon')}</p>
        </Card>
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
