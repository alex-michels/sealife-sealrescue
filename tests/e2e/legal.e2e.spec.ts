import { test, expect } from '@playwright/test'
import { legalNav, legalHref, draftNote } from '../../src/site/legal.js'

/**
 * QA-22: legal-shell (M0-T13 / EU-07) — обязателен на ВСЕХ контент-локалях независимо
 * от набора языков (CLAUDE.md Compliance): 4 legal-роута × 3 локали; на DE — немецкие
 * юридические заголовки (Impressum/Datenschutzerklärung); legal-ссылки в футере
 * КАЖДОЙ публичной страницы (линкуются, не встраиваются). Ожидаемые slug/подписи
 * импортируются из src/site/legal.ts — единый источник правды.
 */

const BASE = 'http://localhost:3000'
const LOCALES = ['ru', 'en', 'de'] as const

test.describe('Legal shell', () => {
  test('4 legal-роута × 3 локали отвечают 200', async ({ request }) => {
    for (const locale of LOCALES) {
      for (const { slug } of legalNav[locale]) {
        const res = await request.get(`${BASE}${legalHref(locale, slug)}`)
        expect(res.status(), `${locale}/${slug}`).toBe(200)
      }
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

  test('placeholder-контент честно помечен draft-плашкой (до юр. проверки)', async ({ page }) => {
    for (const locale of LOCALES) {
      await page.goto(`${BASE}/${locale}/legal-notice`)
      await expect(page.getByText(draftNote[locale])).toBeVisible()
    }
  })

  // Legal-ссылки — из футера каждой публичной страницы (Compliance: «линкуются из футера
  // каждой публичной страницы»). Разные ТИПЫ страниц: главные обоих сайтов, раздел,
  // mock-деталь, legal-страница и 404.
  for (const [name, path, locale] of [
    ['главная sealife', '/ru', 'ru'],
    ['главная sealrescue', '/en?site=sealrescue', 'en'],
    ['раздел', '/de/articles', 'de'],
    ['mock-деталь', '/en/quizzes', 'en'],
    ['legal-страница', '/de/privacy', 'de'],
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
