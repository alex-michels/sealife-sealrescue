import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { sites, type SiteId } from '@/site/config'
import type { LegalLang } from '@/site/legal'
import { LanguageSwitcher } from './LanguageSwitcher'
import { SectionNav } from './SectionNav'
import { SealMascot } from './ui/SealMascot'

/**
 * Header на КАЖДОЙ публичной странице (DESIGN_BRIEF §4a): кликабельный вордмарк —
 * ссылка на главную, чтобы домой можно было вернуться с любой страницы (вкл. legal).
 * На /de-legal ссылка ведёт на `/` (локаль главной выберется автоматически).
 */
const HOME_LABEL: Record<LegalLang, string> = {
  ru: 'На главную',
  en: 'Home',
  de: 'Zur Startseite',
}

export function SiteHeader({ site, lang }: { site: SiteId; lang: LegalLang }) {
  const config = sites[site]
  const homeHref = lang === 'de' ? '/' : `/${lang}`
  const wordmark = lang === 'de' ? config.brand.en : config.brand[lang]

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <Link
          href={homeHref}
          aria-label={HOME_LABEL[lang]}
          className="inline-flex min-h-11 items-center gap-2 text-lg"
        >
          {/* Общий иконочный логотип обоих сайтов; в header он статичный (без анимации). */}
          <SealMascot size={32} />
          <span className="wordmark">{wordmark}</span>
        </Link>
        {lang !== 'de' && <LanguageSwitcher current={lang as Locale} />}
      </div>
      {/* Навигация по разделам — только RU/EN (на /de-legal контент-разделов нет). */}
      {lang !== 'de' && <SectionNav site={site} locale={lang as Locale} />}
    </header>
  )
}
