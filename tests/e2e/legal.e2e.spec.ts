import { test, expect } from '@playwright/test'
import { legalNav, legalHref, draftNote } from '../../src/site/legal.js'

/**
 * QA-22: legal-shell (M0-T13 / EU-07) — обязателен независимо от набора языков сайта
 * (CLAUDE.md Compliance): 4 legal-роута × 3 route-локали.
 *
 * DE перестал быть языком сайта и остался ТОЛЬКО legal-роутом: оператор в Германии,
 * §5 DDG / §18 MStV не зависят от того, на каких языках сайт. Отсюда контракт /de:
 *  - живут ровно четыре legal-страницы с немецкими юр. текстами (Impressum/Datenschutz);
 *  - любой контентный путь под /de отдаёт 404 (страницы валидируют isLocale, не isRouteLocale);
 *  - обвязка (вордмарк, навигация, UI-строки) рендерится на фолбэке en — немецкого UI больше нет,
 *    а legal-ссылки в футере остаются немецкими (legalNav.de).
 *
 * Legal-ссылки — в футере КАЖДОЙ публичной страницы (линкуются, не встраиваются).
 * Ожидаемые slug/подписи импортируются из src/site/legal.ts — единый источник правды.
 */

const BASE = 'http://localhost:3000'
/** Route-локали: контентные ru/en + legal-only de. */
const LEGAL_LOCALES = ['ru', 'en', 'de'] as const

test.describe('Legal shell', () => {
  test('4 legal-роута × 3 route-локали отвечают 200', async ({ request }) => {
    for (const locale of LEGAL_LOCALES) {
      for (const { slug } of legalNav[locale]) {
        const res = await request.get(`${BASE}${legalHref(locale, slug)}`)
        expect(res.status(), `${locale}/${slug}`).toBe(200)
      }
    }
  })

  test('/de — legal-only локаль: юр. роуты 200, контентные 404', async ({ request }) => {
    for (const { slug } of legalNav.de) {
      const res = await request.get(`${BASE}${legalHref('de', slug)}`)
      expect(res.status(), `de/${slug}`).toBe(200)
    }

    // Контентные пути под /de не существуют. Статус проверяем на роутах БЕЗ loading-границы:
    // только там notFound() успевает выставить настоящий HTTP 404 до первого флаша
    // (см. docs/localization.md § «404 и loading-границы»).
    for (const path of ['', '/quizzes', '/definitely-not-a-page']) {
      const res = await request.get(`${BASE}/de${path}`)
      expect(res.status(), `de${path || ' (главная)'}`).toBe(404)
    }
    // Разделы sealrescue — на своём сайте (?site= override, как в proxy.ts).
    for (const path of ['/what-to-do', '/rescue-centers', '/report']) {
      const res = await request.get(`${BASE}/de${path}?site=sealrescue`)
      expect(res.status(), `de${path} (sealrescue)`).toBe(404)
    }
  })

  test('/de: списочные разделы отдают 404-страницу, а не немецкий контент', async ({ page }) => {
    // У списков есть loading.tsx, поэтому статус может быть soft-404 (200) — контракт здесь
    // про содержимое: немецкого раздела нет, рендерится not-found (на фолбэке en).
    for (const path of ['/de/articles', '/de/news', '/de/memes', '/de/species', '/de/games']) {
      await page.goto(`${BASE}${path}`)
      await expect(page.getByRole('heading', { level: 1 }), path).toHaveText('Page not found')
    }
  })

  test('DE рендерит немецкие юридические заголовки', async ({ page }) => {
    await page.goto(`${BASE}/de/legal-notice`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Impressum')
    await page.goto(`${BASE}/de/privacy`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Datenschutzerklärung')
    await page.goto(`${BASE}/de/terms`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nutzungsbedingungen')
  })

  test('на /de обвязка английская (немецкого UI нет), а legal-ссылки немецкие', async ({
    page,
  }) => {
    await page.goto(`${BASE}/de/legal-notice`)
    const header = page.getByRole('banner')

    // Вордмарк и «домой» — на фолбэке en: немецкой главной не существует, вести на неё нельзя.
    await expect(header).toContainText('SeaLife.Info')
    await expect(header.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/en')
    await expect(
      header.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'Articles' }),
    ).toHaveAttribute('href', '/en/articles')
    // Свитчер виден и подписан английской строкой (немецких UI-строк не осталось).
    await expect(header.getByRole('button', { name: 'Language' })).toBeVisible()

    // Cookie-страница собрана из UI-строк, поэтому на /de она английская…
    await page.goto(`${BASE}/de/cookies`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Analytics & cookies')

    // …а сами legal-ссылки в футере остаются немецкими (legalNav.de).
    const nav = page.getByRole('contentinfo').getByRole('navigation', { name: 'Legal' })
    await expect(nav.getByRole('link', { name: 'Impressum', exact: true })).toHaveAttribute(
      'href',
      '/de/legal-notice',
    )
    await expect(nav.getByRole('link', { name: 'Datenschutz', exact: true })).toHaveAttribute(
      'href',
      '/de/privacy',
    )
  })

  test('placeholder-контент честно помечен draft-плашкой (до юр. проверки)', async ({ page }) => {
    for (const locale of LEGAL_LOCALES) {
      await page.goto(`${BASE}/${locale}/legal-notice`)
      await expect(page.getByText(draftNote[locale])).toBeVisible()
    }
  })

  // Legal-ссылки — из футера каждой публичной страницы (Compliance: «линкуются из футера
  // каждой публичной страницы»). Разные ТИПЫ страниц: главные обоих сайтов, раздел,
  // mock-деталь, legal-страница (на legal-only /de) и 404.
  for (const [name, path, locale] of [
    ['главная sealife', '/ru', 'ru'],
    ['главная sealrescue', '/en?site=sealrescue', 'en'],
    ['раздел', '/ru/articles', 'ru'],
    ['mock-деталь', '/en/quizzes', 'en'],
    ['legal-страница /de', '/de/privacy', 'de'],
    ['404', '/ru/definitely-not-a-page', 'ru'],
  ] as const) {
    test(`футер (${name}): все legal-ссылки на языке страницы`, async ({ page }) => {
      await page.goto(`${BASE}${path}`)
      const nav = page.getByRole('contentinfo').getByRole('navigation', { name: 'Legal' })
      for (const item of legalNav[locale]) {
        await expect(
          nav.getByRole('link', { name: item.label, exact: true }),
          `${locale}/${item.slug}`,
        ).toHaveAttribute('href', legalHref(locale, item.slug))
      }
    })
  }
})
