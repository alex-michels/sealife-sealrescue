import type { Metadata } from 'next'
import { locales, routeLocales, fallbackLocale, type Locale, type RouteLocale } from './config'
import { siteBaseUrl, type SiteConfig } from '@/site/config'

/**
 * Строит абсолютные canonical + hreflang alternates для Next metadata (M0-T10).
 *
 * Базовый origin берётся из конфига САЙТА (sealife.info / sealrescue.info), а не из
 * одной env-переменной — иначе при мультидомене (M0-T08) ссылки были бы неверны,
 * а без SERVER_URL — относительными (плохо для SEO).
 *
 * @param pathSuffix путь после локали ('' для главной, '/slug' для страницы)
 * @param current    текущая локаль (для canonical)
 * @param site       текущий сайт (источник домена)
 * @param available  локали, в которых страница РЕАЛЬНО существует. По умолчанию — все контентные:
 *                   так ведут себя страницы, собранные из кода (главная, списки разделов), они
 *                   есть всегда. Документам из Payload набор передаётся честный (CR-01): после
 *                   выключения locale-fallback непереведённый документ отдаёт 404, и рекламировать
 *                   такую альтернативу в hreflang значит звать поисковик на несуществующую страницу.
 *
 * Канонический slug общий для всех локалей; x-default → fallbackLocale, если он доступен.
 */
export function buildAlternates(
  pathSuffix: string,
  current: Locale,
  site: SiteConfig,
  available: readonly Locale[] = locales,
): Metadata['alternates'] {
  const base = siteBaseUrl(site)
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    if (!available.includes(locale)) continue
    languages[locale] = `${base}/${locale}${pathSuffix}`
  }
  // x-default = международный фолбэк (en) — но только если он существует; иначе единственная
  // доступная локаль. Взаимность hreflang держится на том, что обе стороны считают набор
  // одним и тем же хелпером (`localesWithContent`).
  const xDefault = available.includes(fallbackLocale) ? fallbackLocale : available[0]
  if (xDefault) languages['x-default'] = `${base}/${xDefault}${pathSuffix}`

  return {
    canonical: `${base}/${current}${pathSuffix}`,
    languages,
  }
}

/**
 * То же для legal-страниц, у которых набор языков шире контентного: кроме ru/en существует
 * немецкая версия (Impressum/Datenschutz — обязанность оператора в Германии, см.
 * `legalOnlyLocales` в ./config). hreflang перечисляет все три честно: все три реально отдаются.
 */
export function buildLegalAlternates(
  pathSuffix: string,
  current: RouteLocale,
  site: SiteConfig,
): Metadata['alternates'] {
  const base = siteBaseUrl(site)
  const languages: Record<string, string> = {}
  for (const locale of routeLocales) {
    languages[locale] = `${base}/${locale}${pathSuffix}`
  }
  languages['x-default'] = `${base}/${fallbackLocale}${pathSuffix}`

  return {
    canonical: `${base}/${current}${pathSuffix}`,
    languages,
  }
}
