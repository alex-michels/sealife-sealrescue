import { chromeLocale, type RouteLocale } from '@/i18n/config'
import { siteBaseUrl, sites, type SiteId } from './config'

/**
 * JSON-LD (schema.org) — вторая половина **M1-T16**, приехала вместе с **CR-10**.
 *
 * Зачем: без разметки поисковик угадывает, что за страница и кто её издал. С ней — знает, что это
 * статья, когда она вышла и какому изданию принадлежит. Для новостей, которые CLAUDE.md считает
 * journalistisch-redaktionell (§18 MStV), «кто издатель» — не косметика.
 *
 * ⚠️ Разметка обязана СОВПАДАТЬ с видимой страницей: schema.org прямо запрещает размечать то, чего
 * читатель не видит. Поэтому здесь нет ни рейтингов, ни авторов, которых мы не показываем, и дата
 * берётся та же (`publishedAt`, CR-05), что и в шапке материала.
 */

export type JsonLd = Record<string, unknown>

/** Издание целиком — на главной. */
export function websiteJsonLd(site: SiteId, locale: RouteLocale): JsonLd {
  const cfg = sites[site]
  const chrome = chromeLocale(locale)
  const base = siteBaseUrl(cfg)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    name: cfg.brand[chrome],
    description: cfg.tagline[chrome],
    url: `${base}/${locale}`,
    inLanguage: chrome,
    publisher: {
      '@type': 'Organization',
      name: cfg.brand[chrome],
      url: base,
      logo: `${base}/brand/${site}/apple-icon.png`,
    },
  }
}

/** Материал (статья/новость). `type` различает их: у новости своя схема. */
export function articleJsonLd({
  site,
  locale,
  title,
  description,
  path,
  publishedAt,
  updatedAt,
  isNews,
}: {
  site: SiteId
  locale: RouteLocale
  title: string
  description?: string | null
  path: string
  publishedAt?: string | null
  updatedAt?: string | null
  isNews?: boolean
}): JsonLd {
  const cfg = sites[site]
  const chrome = chromeLocale(locale)
  const base = siteBaseUrl(cfg)
  return {
    '@context': 'https://schema.org',
    '@type': isNews ? 'NewsArticle' : 'Article',
    headline: title,
    ...(description ? { description } : {}),
    inLanguage: chrome,
    mainEntityOfPage: `${base}/${locale}${path}`,
    image: `${base}/brand/${site}/og-${chrome}.png`,
    // Дата выхода — та же, что видит читатель (CR-05). `updatedAt` отдаём отдельным полем:
    // склеивать их значило бы повторить ровно ту путаницу, которую CR-05 и разводил.
    ...(publishedAt ? { datePublished: publishedAt } : {}),
    ...(updatedAt ? { dateModified: updatedAt } : {}),
    publisher: {
      '@type': 'Organization',
      name: cfg.brand[chrome],
      url: base,
      logo: `${base}/brand/${site}/apple-icon.png`,
    },
  }
}

/** Разметка отдаётся строкой в <script type="application/ld+json">. */
export const jsonLdScript = (data: JsonLd): string => JSON.stringify(data)
