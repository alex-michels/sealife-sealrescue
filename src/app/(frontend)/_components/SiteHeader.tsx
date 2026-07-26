import Link from 'next/link'
import { chromeLocale, type Locale, type RouteLocale } from '@/i18n/config'
import { sites, type SiteId } from '@/site/config'
import { LanguageSwitcher } from './LanguageSwitcher'
import { SectionNav } from './SectionNav'
import { SealMascot } from './ui/SealMascot'

/**
 * Header на КАЖДОЙ публичной странице (DESIGN_BRIEF §4a): кликабельный вордмарк —
 * ссылка на главную текущей локали, чтобы домой можно было вернуться с любой
 * страницы (включая legal). Переключатель языка и навигация по разделам видны
 * на всех локалях (RU/EN).
 *
 * На legal-only локали (de — немецкий Impressum) контента нет, поэтому вордмарк,
 * навигация и «домой» рендерятся на фолбэке (en): вести с /de/legal-notice на
 * несуществующую /de-главную нельзя.
 */
const HOME_LABEL: Record<Locale, string> = {
  ru: 'На главную',
  en: 'Home',
}

export function SiteHeader({ site, lang }: { site: SiteId; lang: RouteLocale }) {
  const config = sites[site]
  const chrome = chromeLocale(lang)

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <Link
          href={`/${chrome}`}
          aria-label={HOME_LABEL[chrome]}
          className="inline-flex min-h-11 items-center gap-2 text-lg"
        >
          {/* Общий иконочный логотип обоих сайтов; в header он статичный (без анимации). */}
          <SealMascot size={32} />
          <span className="wordmark">{config.brand[chrome]}</span>
        </Link>
        <LanguageSwitcher current={lang} />
      </div>
      <SectionNav site={site} locale={chrome} />
    </header>
  )
}
