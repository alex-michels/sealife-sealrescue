import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { legalNav, legalHref, type LegalLang } from '@/site/legal'
import { LanguageSwitcher } from './LanguageSwitcher'

/**
 * Тонкий, но полноценный футер (§4a/§10): legal-ссылки + cookie settings (= ссылка
 * «Cookies») + переключатель языка (только на RU/EN-страницах).
 *
 * Legal-ссылки показываем ТОЛЬКО на языке страницы (allowlist `legalNav[lang]`):
 * на EN/RU-странице НЕТ немецких (/de) ссылок; на /de legal-странице — только DE.
 */
export function SiteFooter({ lang }: { lang: LegalLang }) {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8">
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {legalNav[lang].map((item) => (
            <Link
              key={item.slug}
              href={legalHref(lang, item.slug)}
              className="text-muted hover:text-link"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted">
          <span className="font-mono text-xs">© {new Date().getFullYear()}</span>
          {lang !== 'de' && <LanguageSwitcher current={lang as Locale} />}
        </div>
      </div>
    </footer>
  )
}
