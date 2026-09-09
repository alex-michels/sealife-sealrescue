import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { pickLocale, proxy } from '@/proxy'
import { legalSlugs } from '@/site/legalRoutes'
import { legalNav } from '@/site/legal'
import { routeLocales } from '@/i18n/config'

/**
 * QA-19: роутинг proxy.ts — авто-выбор локали и rewrite/redirect-контракт.
 * Политика (localization.md): cookie NEXT_LOCALE > Accept-Language (q-веса) > en;
 * авто-выбор ТОЛЬКО на путях без локали (не forced-редирект).
 */

const req = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost:3000${url}`, { headers })

describe('pickLocale', () => {
  it('cookie NEXT_LOCALE важнее языка браузера', () => {
    expect(
      pickLocale(req('/', { cookie: 'NEXT_LOCALE=en', 'accept-language': 'ru-RU,ru;q=0.9' })),
    ).toBe('en')
  })

  // de удалён как язык сайта (2026-07-26): в cookie он больше не валиден.
  it('legal-only локаль de в cookie игнорируется как невалидная', () => {
    expect(
      pickLocale(req('/', { cookie: 'NEXT_LOCALE=de', 'accept-language': 'ru-RU,ru;q=0.9' })),
    ).toBe('ru')
  })

  it('невалидная cookie игнорируется', () => {
    expect(pickLocale(req('/', { cookie: 'NEXT_LOCALE=xx', 'accept-language': 'ru-RU' }))).toBe(
      'ru',
    )
  })

  it('Accept-Language: учитываются q-веса, а не порядок', () => {
    expect(pickLocale(req('/', { 'accept-language': 'en;q=0.8,ru;q=0.9' }))).toBe('ru')
    expect(pickLocale(req('/', { 'accept-language': 'en;q=0.9,ru;q=0.8' }))).toBe('en')
  })

  it('региональные теги сводятся к языку (en-GB → en, ru-RU → ru)', () => {
    expect(pickLocale(req('/', { 'accept-language': 'en-GB,en;q=0.9' }))).toBe('en')
    expect(pickLocale(req('/', { 'accept-language': 'ru-RU,en;q=0.5' }))).toBe('ru')
  })

  it('первый ПОДДЕРЖИВАЕМЫЙ из ранжированных (fr выше, но не поддержан → ru)', () => {
    expect(pickLocale(req('/', { 'accept-language': 'fr-FR,fr;q=0.9,ru;q=0.8' }))).toBe('ru')
  })

  // Немецкоязычный посетитель больше не получает /de — только en (немецкого контента нет).
  it('немецкий браузер → en (de больше не контент-локаль)', () => {
    expect(pickLocale(req('/', { 'accept-language': 'de-DE,de;q=0.9' }))).toBe('en')
  })

  it('неподдерживаемый язык или пустой заголовок → en (международный фолбэк)', () => {
    expect(pickLocale(req('/', { 'accept-language': 'fr-FR,fr;q=0.9' }))).toBe('en')
    expect(pickLocale(req('/'))).toBe('en')
    expect(pickLocale(req('/', { 'accept-language': '' }))).toBe('en')
  })
})

describe('proxy(): redirect без локали в пути', () => {
  it('/ → 307 на /<locale> с Vary (кэши зависят от языка/куки)', () => {
    const res = proxy(req('/', { 'accept-language': 'ru-RU' }))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/ru')
    expect(res.headers.get('vary')).toBe('Accept-Language, Cookie')
  })

  it('путь и query сохраняются при redirect', () => {
    const res = proxy(req('/articles?topic=biology', { 'accept-language': 'ru' }))
    const url = new URL(res.headers.get('location')!)
    expect(url.pathname).toBe('/ru/articles')
    expect(url.searchParams.get('topic')).toBe('biology')
  })
})

describe('proxy(): rewrite с локалью в пути', () => {
  // Контракт NextResponse.rewrite: целевой URL в x-middleware-rewrite,
  // подменённые request-заголовки — в x-middleware-request-* + список в
  // x-middleware-override-headers. Эти заголовки — то, как Next передаёт
  // rewrite/headers из proxy в рендер (QA-19: «x-site/x-locale ставятся при rewrite»).
  it('локаль в пути → внутренний сегмент [site] БЕЗ смены URL пользователя', () => {
    const res = proxy(req('/ru/articles'))
    const rewrite = new URL(res.headers.get('x-middleware-rewrite')!)
    expect(rewrite.pathname).toBe('/sealife/ru/articles')
  })

  // legal-only локаль: префикс /de распознаётся (иначе Impressum улетел бы в /en/de/...),
  // остальные /de пути proxy отправляет в отдельный 404-роут до стриминга.
  it('/de/privacy НЕ редиректится: legal-only локаль — валидный префикс пути', () => {
    const res = proxy(req('/de/privacy'))
    expect(res.headers.get('location')).toBeNull()
    const rewrite = new URL(res.headers.get('x-middleware-rewrite')!)
    expect(rewrite.pathname).toBe('/sealife/de/privacy')
  })

  it('rewrite ставит x-site/x-locale (для not-found.tsx и др. без params)', () => {
    const res = proxy(req('/en/quizzes'))
    expect(res.headers.get('x-middleware-request-x-site')).toBe('sealife')
    expect(res.headers.get('x-middleware-request-x-locale')).toBe('en')
    expect(res.headers.get('x-middleware-override-headers')).toContain('x-site')
  })

  it('сайт по хосту: sealrescue-домен → сегмент /sealrescue', () => {
    const res = proxy(
      new NextRequest('http://sealrescue.info/ru/rescue-centers', {
        headers: { host: 'sealrescue.info' },
      }),
    )
    const rewrite = new URL(res.headers.get('x-middleware-rewrite')!)
    expect(rewrite.pathname).toBe('/sealrescue/ru/rescue-centers')
    expect(res.headers.get('x-middleware-request-x-site')).toBe('sealrescue')
  })

  it('?site=override работает на localhost (дев/превью)', () => {
    const res = proxy(req('/ru?site=sealrescue'))
    const rewrite = new URL(res.headers.get('x-middleware-rewrite')!)
    expect(rewrite.pathname).toBe('/sealrescue/ru')
  })

  it('язык НЕ запоминается прокси: rewrite не ставит NEXT_LOCALE cookie', () => {
    const res = proxy(req('/de/articles'))
    expect(res.headers.get('set-cookie') ?? '').not.toContain('NEXT_LOCALE')
  })
})

describe('CR-16: legal-only paths are rejected before list streaming', () => {
  it('the proxy allowlist matches every locale’s legal navigation', () => {
    for (const locale of routeLocales) {
      expect(legalNav[locale].map(({ slug }) => slug)).toEqual([...legalSlugs])
    }
  })

  it.each(legalSlugs)('preserves exactly /de/%s, including a trailing slash', (slug) => {
    for (const suffix of ['', '/']) {
      const res = proxy(req(`/de/${slug}${suffix}?site=sealrescue`))
      expect(new URL(res.headers.get('x-middleware-rewrite')!).pathname).toBe(
        `/sealrescue/de/${slug}${suffix}`,
      )
      expect(res.headers.get('location')).toBeNull()
    }
  })

  it.each(['', '/articles', '/species/seal', '/privacy/extra', '/privacy-policy', '/terms-extra'])(
    'rewrites /de%s to the branded 404 route',
    (path) => {
      for (const site of ['sealife', 'sealrescue']) {
        const res = proxy(req(`/de${path}?site=${site}&topic=biology`))
        const rewrite = new URL(res.headers.get('x-middleware-rewrite')!)
        expect(rewrite.pathname).toBe(`/${site}/de/not-found`)
        expect(rewrite.searchParams.get('topic')).toBe('biology')
        expect(res.headers.get('location')).toBeNull()
        expect(res.headers.get('x-middleware-request-x-site')).toBe(site)
        expect(res.headers.get('x-middleware-request-x-locale')).toBe('de')
        expect(res.headers.get('set-cookie') ?? '').not.toContain('NEXT_LOCALE')
      }
    },
  )
})
