import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { LanguageSwitcher } from './LanguageSwitcher'

/**
 * Тонкий футер. Постоянная точка доступа к: переключателю языка (всегда виден —
 * DESIGN_BRIEF §9) и настройкам согласия (отзыв так же доступен, как дача — GDPR).
 * Legal-ссылки (Impressum/Datenschutz/Cookies/Terms, DE+EN) добавятся в M0-T13.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-xs">© {new Date().getFullYear()}</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/${locale}/cookies`} className="hover:text-text">
            {t(locale, 'footerCookies')}
          </Link>
          <LanguageSwitcher current={locale} />
        </div>
      </div>
    </footer>
  )
}
