import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { sites, type SiteId } from '@/site/config'
import { LanguageSwitcher } from './LanguageSwitcher'
import { SectionNav } from './SectionNav'
import { SealMascot } from './ui/SealMascot'

/**
 * Header на КАЖДОЙ публичной странице (DESIGN_BRIEF §4a): кликабельный вордмарк —
 * ссылка на главную текущей локали, чтобы домой можно было вернуться с любой
 * страницы (включая legal). Переключатель языка и навигация по разделам видны
 * на всех локалях (RU/EN/DE).
 */
const HOME_LABEL: Record<Locale, string> = {
  ru: 'На главную',
  en: 'Home',
  de: 'Zur Startseite',
}

export function SiteHeader({ site, lang }: { site: SiteId; lang: Locale }) {
  const config = sites[site]

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <Link
          href={`/${lang}`}
          aria-label={HOME_LABEL[lang]}
          className="inline-flex min-h-11 items-center gap-2 text-lg"
        >
          {/* Общий иконочный логотип обоих сайтов; в header он статичный (без анимации). */}
          <SealMascot size={32} />
          <span className="wordmark">{config.brand[lang]}</span>
        </Link>
        <LanguageSwitcher current={lang} />
      </div>
      <SectionNav site={site} locale={lang} />
    </header>
  )
}
