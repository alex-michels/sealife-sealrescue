import { test, expect } from '@playwright/test'
import { locales, fallbackLocale } from '@/i18n/config'
import { sites } from '@/site/config'

/**
 * Homepage smoke: branding + locale-routing invariants (CLAUDE.md «Локали и роутинг»).
 *
 * - Каждая локаль (ru/en/de) — полноценная: главная отдаёт локализованный
 *   title/вордмарк и правильный <html lang>.
 * - `/` без локали → redirect по Accept-Language (ru → /ru, прочие → /en);
 *   это авто-выбор ТОЛЬКО на путях без локали, не forced-редирект.
 * - Свитчер языка виден (инвариант «не прятать свитчер»).
 * - Сайт выбирается по хосту; на localhost — через ?site= override (proxy.ts).
 */

const BASE = 'http://localhost:3000'
const sealife = sites.sealife

test.describe('Frontend', () => {
  for (const locale of locales) {
    test(`sealife /${locale} homepage shows «${sealife.brand[locale]}»`, async ({ page }) => {
      await page.goto(`${BASE}/${locale}`)

      await expect(page).toHaveTitle(sealife.brand[locale])
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(sealife.brand[locale])
      // Инвариант: свитчер языка не прячем.
      await expect(page.locator('button[aria-haspopup="menu"]').first()).toBeVisible()
    })
  }

  test('sealrescue homepage (site override) shows its own brand', async ({ page }) => {
    await page.goto(`${BASE}/en?site=sealrescue`)

    await expect(page).toHaveTitle(sites.sealrescue.brand.en)
    await expect(page.locator('html')).toHaveAttribute('data-site', 'sealrescue')
  })

  test.describe('root redirect for Russian browsers', () => {
    test.use({ locale: 'ru-RU' })

    test('/ redirects to /ru', async ({ page }) => {
      await page.goto(`${BASE}/`)
      await expect(page).toHaveURL(`${BASE}/ru`)
      await expect(page).toHaveTitle(sealife.brand.ru)
    })
  })

  test.describe('root redirect for unsupported browser languages', () => {
    test.use({ locale: 'fr-FR' })

    test(`/ falls back to /${fallbackLocale}`, async ({ page }) => {
      await page.goto(`${BASE}/`)
      await expect(page).toHaveURL(`${BASE}/${fallbackLocale}`)
      await expect(page).toHaveTitle(sealife.brand[fallbackLocale])
    })
  })

  // Несуществующие slug → настоящий HTTP 404 + локализованная not-found.tsx (M0-T19).
  // Работает потому, что у детальных роутов НЕТ loading-границы: скелеты живут только
  // у списков (loading.tsx раздела / route-группы `(list)` / <Suspense> ленты главной),
  // поэтому notFound() успевает выставить статус до первого флаша ответа.
  for (const [route, path] of [
    ['content [slug]', '/en/definitely-not-a-page'],
    ['quizzes', '/en/quizzes/definitely-not-a-page'],
    ['species', '/en/species/definitely-not-a-page'],
    ['rescue-centers', '/en/rescue-centers/definitely-not-a-page?site=sealrescue'],
  ] as const) {
    test(`nonexistent ${route} slug returns 404`, async ({ page }) => {
      const response = await page.goto(`${BASE}${path}`)
      expect(response?.status()).toBe(404)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found')
    })
  }

  test('not-found page is localized (ru)', async ({ page }) => {
    const response = await page.goto(`${BASE}/ru/definitely-not-a-page`)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Страница не найдена')
  })

  test('section of the other site returns 404 (route guard)', async ({ page }) => {
    // rescue-centers — раздел sealrescue; на sealife (default на localhost) его нет.
    const response = await page.goto(`${BASE}/en/rescue-centers`)
    expect(response?.status()).toBe(404)
  })

  test('unknown locale prefix ends in 404', async ({ page }) => {
    const response = await page.goto(`${BASE}/xx/articles`)
    expect(response?.status()).toBe(404)
  })
})
