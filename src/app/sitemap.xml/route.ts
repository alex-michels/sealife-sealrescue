import { getPayload } from 'payload'
import config from '@payload-config'

import { locales, fallbackLocale, type Locale } from '@/i18n/config'
import { localesWithContent } from '@/i18n/translated'
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

/** `locales` — где страница реально существует; undefined = во всех (страницы из кода). */
type SitemapPage = { path: string; lastmod?: string; locales?: Locale[] }

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&apos;',
  )

/**
 * Один `<url>` для конкретной локали страницы + hreflang-альтернативы (вкл. self и x-default).
 *
 * CR-01: перечисляются только локали, в которых страница РЕАЛЬНО существует (`page.locales`).
 * Раньше на каждую запись вешался полный набор ru+en независимо от того, переведён документ или
 * нет, — то есть sitemap звал поисковик на страницу, которая теперь отдаёт 404.
 */
function renderUrl(base: string, page: SitemapPage, locale: string): string {
  const available = page.locales ?? locales
  const xDefault = available.includes(fallbackLocale) ? fallbackLocale : available[0]
  const links = [
    ...locales
      .filter((alt) => available.includes(alt))
      .map((alt) => ({ hreflang: alt as string, target: alt as string })),
    ...(xDefault ? [{ hreflang: 'x-default', target: xDefault as string }] : []),
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
      const published = { _status: { equals: 'published' as const } }

      // CR-01: slug канонический и общий для локалей, но ПЕРЕВОД — нет. Считаем, в каких
      // локалях документ реально существует, тем же хелпером, что и hreflang страницы:
      // разойдись они — hreflang перестал бы быть взаимным.
      const contentLocales = await localesWithContent(payload, 'content', published)
      const speciesLocales = await localesWithContent(payload, 'species', published)

      const { docs } = await payload.find({
        collection: 'content',
        where: published,
        sort: '-updatedAt',
        depth: 0,
        pagination: false,
      })
      for (const doc of docs) {
        const available = [...(contentLocales.get(doc.slug) ?? [])]
        if (available.length === 0) continue // не переведён нигде — в карте сайта ему не место
        pages.push({
          path: `/${doc.slug}`,
          lastmod: new Date(doc.updatedAt).toISOString().slice(0, 10),
          locales: available,
        })
      }

      // Тюленепедия (M1-T03): виды живут на /species/[slug].
      const species = await payload.find({
        collection: 'species',
        where: published,
        sort: '-updatedAt',
        depth: 0,
        pagination: false,
      })
      for (const doc of species.docs) {
        const available = [...(speciesLocales.get(doc.slug) ?? [])]
        if (available.length === 0) continue
        pages.push({
          path: `/species/${doc.slug}`,
          lastmod: new Date(doc.updatedAt).toISOString().slice(0, 10),
          locales: available,
        })
      }
    } catch {
      // Карта сайта не должна падать из-за БД — отдаём хотя бы главную.
    }
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    pages
      .flatMap((page) =>
        // <loc> только для локалей, где страница есть (CR-01).
        locales
          .filter((l) => (page.locales ?? locales).includes(l))
          .map((l) => renderUrl(base, page, l)),
      )
      .join('\n') +
    '\n</urlset>\n'

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
