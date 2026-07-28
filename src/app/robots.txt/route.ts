import { resolveSiteId, sites, siteBaseUrl } from '@/site/config'

/**
 * `robots.txt` (Roadmap **CR-09**, добивает **M1-T15**).
 *
 * До этого файла не было вовсе — то есть на карту сайта ничто не указывало.
 *
 * Роут динамический по той же причине, что и `sitemap.xml`: одно приложение обслуживает два
 * домена, и `Sitemap:` обязан указывать на ТОТ хост, который спросили. Путь содержит точку и
 * потому не переписывается прокси (matcher в `src/proxy.ts`).
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const site = sites[resolveSiteId(request.headers.get('host'), url.searchParams.get('site'))]
  const base = siteBaseUrl(site)

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Админка и служебные эндпоинты Payload — не для индексации.',
    'Disallow: /admin',
    '',
    '# Медиа отдаётся приложением (/api/media/file/**) обычным <img>, а не через /_next/image,',
    '# поэтому его индексировать НУЖНО. Побеждает более длинное совпадение (RFC 9309), поэтому',
    '# Allow перекрывает общий Disallow независимо от порядка строк.',
    'Allow: /api/media/',
    'Disallow: /api/',
    '',
    // ⚠️ `styleguide` сознательно НЕ запрещаем: у неё стоит `robots: noindex` в метаданных, а
    // запрет обхода помешал бы краулеру этот noindex увидеть — страница осталась бы в индексе.
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
