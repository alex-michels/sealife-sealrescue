import { getPayload } from 'payload'
import config from '@payload-config'

import { locales, routeLocales, fallbackLocale, type RouteLocale } from '@/i18n/config'
import { localesWithContent } from '@/i18n/translated'
import { resolveSiteId, sites, siteBaseUrl } from '@/site/config'
import { contentSite } from '@/content/contentTypes'
import { sectionsForSite } from '@/site/sections'
import { legalNav } from '@/site/legal'

/**
 * Карта сайта по локалям (M0-T10): абсолютные production-URL + hreflang + x-default,
 * согласованные с canonical/alternates страниц (см. `i18n/alternates.ts`).
 *
 * Мультидомен (M0-T08): sealife.info и sealrescue.info обслуживает одно приложение,
 * поэтому набор URL зависит от хоста запроса. `/sitemap.xml` содержит точку и НЕ
 * переписывается прокси (см. matcher в `proxy.ts`) — host читаем прямо из запроса.
 * `?site=` — дев/превью-override, как в proxy; в проде хватает домена.
 *
 * ## Состав (CR-09)
 * До этой правки в карте были только главная и slug'и `content`/`species`, то есть **ни одной
 * секционной страницы**, ни legal, а у sealrescue — буквально одна главная. Значит `/what-to-do`,
 * ради которого второй сайт и существует, поисковикам не подавался вовсе.
 *
 * Теперь: главная + разделы сайта (из `sections.ts`, включая `nav: false` — это полноценные
 * страницы) + legal-страницы + детали `content`/`species`/`games` для sealife.
 *
 * ⚠️ **Разделы на выдуманных данных не подаются вовсе** (`mockBacked` в `sections.ts`:
 * `rescue-centers`, `quizzes`). Раньше здесь стояло рассуждение «детали не подаём, а списочная
 * страница настоящая» — оно неверно дважды: список `rescue-centers` сам сделан из выдуманных
 * центров с рабочими на вид телефонами и «штампом проверки», и он ссылается на свои детали, так
 * что краулер дошёл бы до них в один шаг. Поэтому такие разделы ещё и `noindex`
 * (`noindexIfMock` в `_components/mock/mockSection.tsx`).
 *
 * `styleguide` не в `sections.ts` и потому не попадает сюда автоматически; у него свой `noindex`.
 */
export const dynamic = 'force-dynamic'

/**
 * `locales` — в каких route-локалях страница существует.
 * Контентные страницы живут в `ru`/`en`; legal — ещё и в `de` (немецкие Impressum/Datenschutz
 * реально отдаются, см. `i18n/alternates.ts`).
 */
type SitemapPage = { path: string; lastmod?: string; locales: readonly RouteLocale[] }

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&apos;',
  )

/**
 * Один `<url>` для конкретной локали страницы + hreflang-альтернативы (вкл. self и x-default).
 *
 * CR-01: перечисляются только локали, в которых страница РЕАЛЬНО существует. Раньше на каждую
 * запись вешался полный набор ru+en независимо от того, переведён документ или нет, — то есть
 * sitemap звал поисковик на страницу, которая теперь отдаёт 404.
 */
function renderUrl(base: string, page: SitemapPage, locale: RouteLocale): string {
  const available = page.locales
  const xDefault = available.includes(fallbackLocale) ? fallbackLocale : available[0]
  const links = [
    ...routeLocales
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
  const siteId = resolveSiteId(request.headers.get('host'), url.searchParams.get('site'))
  const site = sites[siteId]
  const base = siteBaseUrl(site)

  const pages: SitemapPage[] = [
    // Главная — в каждой контент-локали всегда.
    { path: '', locales },
    // Разделы сайта: их набор и есть структура сайта, поэтому берём из того же источника,
    // что и навигация с route-guard'ами (CR-09). `nav: false` тоже включаем — это настоящие
    // страницы, просто не вынесенные в основное меню.
    //
    // ⚠️ КРОМЕ разделов на выдуманных данных (`mockBacked`). Подать в карту `/rescue-centers`
    // значило бы позвать краулер на четыре несуществующих центра с выдуманными телефонами и
    // «штампом проверки» — прямое нарушение инварианта №7 на аварийном пути. Одного исключения
    // из карты мало, поэтому у таких страниц ещё и `noindex` (см. `noindexIfMock`).
    ...sectionsForSite(siteId)
      .filter((s) => !s.mockBacked)
      .map((s) => ({ path: `/${s.slug}`, locales })),
    // Legal — единственные страницы, которые существуют ещё и на `de` (§5 DDG / §18 MStV).
    ...legalNav.en.map((doc) => ({ path: `/${doc.slug}`, locales: routeLocales })),
  ]

  if (siteId === contentSite) {
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
        // CR-05: порядок — по дате выхода. А вот `lastmod` ниже ОСТАЁТСЯ `updatedAt`, и это не
        // недосмотр: lastmod по определению «когда последний раз менялось», то есть именно правка.
        sort: '-publishedAt',
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

      // Игры: у деталей есть публичная страница, и она payload-backed так же, как контент.
      const gameLocales = await localesWithContent(payload, 'games', published)
      const games = await payload.find({
        collection: 'games',
        where: published,
        sort: 'order',
        depth: 0,
        pagination: false,
      })
      for (const doc of games.docs) {
        const available = [...(gameLocales.get(doc.slug) ?? [])]
        if (available.length === 0) continue
        pages.push({
          path: `/games/${doc.slug}`,
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
      // Карта сайта не должна падать из-за БД — отдаём хотя бы страницы из кода.
    }
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    pages
      .flatMap((page) =>
        // <loc> только для локалей, где страница есть (CR-01).
        routeLocales.filter((l) => page.locales.includes(l)).map((l) => renderUrl(base, page, l)),
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
