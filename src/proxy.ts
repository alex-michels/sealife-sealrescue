import { NextResponse, type NextRequest } from 'next/server'
import { locales, fallbackLocale } from '@/i18n/config'
import { resolveSiteId } from '@/site/config'

/**
 * Роутинг публичного фронтенда (Next 16 `proxy.ts`, бывш. middleware):
 *  1. Мультидомен (M0-T08): хост → сайт → внутренний rewrite на сегмент [site].
 *  2. Локализация (M0-T09): нет локали в пути → redirect на нужную локаль.
 *
 * Авто-выбор языка (БЕЗ forced-редиректа, только на путях без локали): русскоязычные → ru,
 * остальные (вкл. неподдерживаемые языки и запросы без заголовка) → en.
 * Приоритет: явный выбор (cookie NEXT_LOCALE) > Accept-Language (q-веса) > fallbackLocale (en).
 * Язык запоминается ТОЛЬКО при явном выборе в LanguageSwitcher (cookie ставит он, не proxy).
 *
 * Payload (admin/api) и служебные пути исключены matcher'ом ниже.
 */
export function pickLocale(req: NextRequest): string {
  // 1. Явный выбор пользователя (cookie) — важнее языка браузера.
  const cookie = req.cookies.get('NEXT_LOCALE')?.value
  if (cookie && (locales as readonly string[]).includes(cookie)) return cookie

  // 2. Язык браузера/системы (Accept-Language) с учётом q-весов.
  const header = req.headers.get('accept-language')
  if (header) {
    const ranked = header
      .split(',')
      .map((part) => {
        const [tag, ...params] = part.trim().split(';')
        const qParam = params.find((p) => p.trim().startsWith('q='))
        const q = qParam ? Number.parseFloat(qParam.split('=')[1] ?? '1') : 1
        return { lang: (tag ?? '').trim().slice(0, 2).toLowerCase(), q: Number.isFinite(q) ? q : 0 }
      })
      .filter((x) => x.lang)
      .sort((a, b) => b.q - a.q)

    for (const { lang } of ranked) {
      if ((locales as readonly string[]).includes(lang)) return lang
    }
  }

  // 3. Язык не поддерживаем (или нет заголовка) → en (политика: не-русские → en).
  return fallbackLocale
}

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  const siteOverride = searchParams.get('site') ?? req.cookies.get('site')?.value
  const siteId = resolveSiteId(req.headers.get('host'), siteOverride)

  const pathLocale = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )

  // Нет локали в пути → авто-определение языка и redirect (search сохраняется в clone).
  if (!pathLocale) {
    const locale = pickLocale(req)
    const url = req.nextUrl.clone()
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
    const redirect = NextResponse.redirect(url)
    // Результат зависит от языка/куки — подсказка для кэшей/CDN.
    redirect.headers.set('Vary', 'Accept-Language, Cookie')
    return redirect
  }

  // Есть локаль → rewrite на внутренний сегмент [site]. URL пользователя не меняется.
  // Язык НЕ запоминаем здесь — cookie NEXT_LOCALE ставит LanguageSwitcher при явном выборе.
  const url = req.nextUrl.clone()
  url.pathname = `/${siteId}${pathname}`
  // x-site/x-locale — для мест без params (not-found.tsx рендерится без props).
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-site', siteId)
  requestHeaders.set('x-locale', pathLocale)
  const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } })

  // Дев/превью-override сайта.
  if (searchParams.get('site')) res.cookies.set('site', siteId, { path: '/' })

  return res
}

export const config = {
  // Не трогаем admin, api (Payload), внутренние пути Next и файлы (со .расширением).
  matcher: ['/((?!admin|api|_next|_static|favicon.ico|.*\\..*).*)'],
}
