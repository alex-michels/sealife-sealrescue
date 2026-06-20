import type { Locale } from '@/i18n/config'
import { sites } from '@/site/config'
import { t } from '@/i18n/ui'
import { LocaleSwitcher } from '../LocaleSwitcher'
import { Card } from '../ui/Card'
import { buttonClasses } from '../ui/Button'

/**
 * Главная sealrescue — emergency-first (DESIGN_BRIEF §4), серьёзный тон.
 * M0-T08 каркас: единственная задача главной — «нашёл тюленя → что делать».
 * Полный каталог центров/«что делать» — M2.
 */
export function SealrescueHome({ locale }: { locale: Locale }) {
  const site = sites.sealrescue
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="flex items-center justify-between gap-4">
        <span className="font-mono text-sm text-muted">{site.domain}</span>
        <LocaleSwitcher locale={locale} pathSuffix="" />
      </header>

      {/* Герой = сама задача спасения. Один акцентный CTA (--buoy). */}
      <section className="py-14">
        <h1 className="text-4xl text-primary">{t(locale, 'rescueHeadline')}</h1>
        <p className="mt-4 text-xl text-muted">{t(locale, 'rescueLead')}</p>
        <a href="#centers" className={buttonClasses('accent', 'lg', 'mt-8')}>
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
      <Card className="mt-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg">{t(locale, 'crossLife')}</p>
        <a href="https://sealife.info" className={buttonClasses('ghost', 'md', 'shrink-0')}>
          {t(locale, 'crossLifeCta')}
        </a>
      </Card>
    </div>
  )
}
