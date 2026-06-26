import { getPayload } from 'payload'
import config from '@payload-config'

import { locales, fallbackLocale } from '@/i18n/config'
import { resolveSiteId, sites, siteBaseUrl } from '@/site/config'

/**
 * Карта сайта по локалям (M0-T10): абсолютные production-URL + hreflang + x-default,
 * согласованные с canonical/alternates страниц (см. `i18n/alternates.ts`).
 *
 * Мультидомен (M0-T08): sealife.info и sealrescue.info обслуживает одно приложение,
 * поэтому набор URL зависит от хоста запроса. `/sitemap.xml` содержит точку и НЕ
 * переписывается прокси (см. matcher в `proxy.ts`) — host читаем прямо из запроса.
 * `?site=` — дев/превью-override, как в proxy; в проде хватает домена.
 *
 * Контент-страницы (`content`) — только медиа-хаб sealife. Справочник sealrescue
 * (центры реабилитации) появится в M2 — тогда добавить сюда `rescue-centers`.
 */
export const dynamic = 'force-dynamic'

type SitemapPage = { path: string; lastmod?: string }

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&apos;',
  )

/** Один `<url>` для конкретной локали страницы + полный набор hreflang-альтернатив (вкл. self и x-default). */
function renderUrl(base: string, page: SitemapPage, locale: string): string {
  const links = [
    ...locales.map((alt) => ({ hreflang: alt as string, target: alt as string })),
    { hreflang: 'x-default', target: fallbackLocale as string },
  ]
    .map(
      ({ hreflang, target }) =>
        `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(`${base}/${target}${page.path}`)}" />`,
    )
    .join('\n')

  return [
    '  <url>',
    `    <loc>${escapeXml(`${base}/${locale}${page.path}`)}</loc>`,
    links,
    ...(page.lastmod ? [`    <lastmod>${page.lastmod}</lastmod>`] : []),
    '  </url>',
  ].join('\n')
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const site = sites[resolveSiteId(request.headers.get('host'), url.searchParams.get('site'))]
  const base = siteBaseUrl(site)

  // Главная — в каждой локали всегда.
  const pages: SitemapPage[] = [{ path: '' }]

  if (site.id === 'sealife') {
    try {
      const payload = await getPayload({ config })
      const { docs } = await payload.find({
        collection: 'content',
        where: { _status: { equals: 'published' } },
        sort: '-updatedAt',
        depth: 0,
        pagination: false,
      })
      for (const doc of docs) {
        // slug канонический и общий для локалей — одной выборки хватает на ru+en.
        pages.push({ path: `/${doc.slug}`, lastmod: new Date(doc.updatedAt).toISOString().slice(0, 10) })
      }

      // Тюленепедия (M1-T03): виды живут на /species/[slug].
      const species = await payload.find({
        collection: 'species',
        where: { _status: { equals: 'published' } },
        sort: '-updatedAt',
        depth: 0,
        pagination: false,
      })
      for (const doc of species.docs) {
        pages.push({
          path: `/species/${doc.slug}`,
          lastmod: new Date(doc.updatedAt).toISOString().slice(0, 10),
        })
      }
    } catch {
      // Карта сайта не должна падать из-за БД — отдаём хотя бы главную.
    }
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    pages.flatMap((page) => locales.map((locale) => renderUrl(base, page, locale))).join('\n') +
    '\n</urlset>\n'

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
