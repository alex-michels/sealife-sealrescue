import type { Metadata } from 'next'
import { chromeLocale, type RouteLocale } from '@/i18n/config'
import { siteBaseUrl, sites, type SiteId } from './config'

/**
 * OpenGraph / Twitter / иконки (Roadmap **CR-10**, сводит **M1-T11** и половину **M1-T16**).
 *
 * ## Что было
 * `generateMetadata` ставил только title, description и alternates. Ни `openGraph`, ни `twitter`,
 * ни `metadataBase`, ни одной иконки. Аудитория проекта приходит из сообществ VK/TG — значит
 * **каждая** ссылка, которую владелец туда кладёт, рисовалась голым заголовком без картинки и с
 * дефолтным глобусом во вкладке.
 *
 * ## Почему хелпер, а не поля россыпью по страницам
 * Next мержит метаданные по сегментам ПОВЕРХНОСТНО: если дочерняя страница задаёт свой
 * `openGraph`, он ЗАМЕЩАЕТ родительский целиком, а не дополняет. То есть страница, поставившая
 * один только `openGraph.title`, потеряла бы и картинку, и `siteName`, и локаль — молча.
 * Поэтому здесь собирается всегда ПОЛНЫЙ объект, а страницы зовут хелпер.
 */

/** Абсолютный origin сайта. Всегда прод-домен — как у canonical (см. `i18n/alternates.ts`). */
export const metadataBaseFor = (site: SiteId): URL => new URL(siteBaseUrl(sites[site]))

/**
 * Иконки сайта. У двух сайтов разные бренды, поэтому файловый `favicon.ico` в корне не подходит —
 * он один на приложение. Задаём путями, они разные по сайту.
 */
export const iconsFor = (site: SiteId): Metadata['icons'] => ({
  icon: [{ url: `/brand/${site}/icon.svg`, type: 'image/svg+xml' }],
  apple: [{ url: `/brand/${site}/apple-icon.png`, sizes: '180x180' }],
})

/** OG-локаль в формате, который ждут соцсети (`ru_RU`, `en_US`, `de_DE`). */
const ogLocale: Record<string, string> = { ru: 'ru_RU', en: 'en_US', de: 'de_DE' }

export function socialMetadata({
  site,
  locale,
  title,
  description,
  path,
  type = 'website',
}: {
  site: SiteId
  locale: RouteLocale
  title: string
  description?: string | null
  /** Путь ПОСЛЕ локали: '' для главной, '/slug' для страницы. */
  path: string
  type?: 'website' | 'article'
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const cfg = sites[site]
  const chrome = chromeLocale(locale)
  const base = siteBaseUrl(cfg)
  const desc = description?.trim() || cfg.tagline[chrome]
  // Картинка локализована: на ней вордмарк, а он у ru и en разный.
  const image = `${base}/brand/${site}/og-${chrome}.png`

  return {
    openGraph: {
      type,
      siteName: cfg.brand[chrome],
      title,
      description: desc,
      url: `${base}/${locale}${path}`,
      locale: ogLocale[locale] ?? ogLocale.en,
      images: [{ url: image, width: 1200, height: 630, alt: cfg.brand[chrome] }],
    },
    twitter: {
      // summary_large_image — иначе картинка 1200×630 обрежется в маленький квадрат.
      card: 'summary_large_image',
      title,
      description: desc,
      images: [image],
    },
  }
}
