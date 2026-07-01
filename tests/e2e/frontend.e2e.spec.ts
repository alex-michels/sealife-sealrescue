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

  // Несуществующие slug: рендерится not-found UI + <meta name="robots" content="noindex">.
  //
  // NB: HTTP-статус при этом 200 (soft-404), а не 404 из инварианта CLAUDE.md.
  // notFound() на детальных роутах срабатывает ниже loading.tsx ([site]/[locale]/loading.tsx):
  // shell уже отправлен со статусом 200, и даже notFound() в generateMetadata статус не меняет
  // (проверено и на dev, и на next build/start, и с UA html-limited-бота). Настоящий 404
  // требует решения по границе стриминга (см. Roadmap); пока фиксируем noindex-контракт.
  for (const [route, path] of [
    ['content [slug]', '/en/definitely-not-a-page'],
    ['quizzes', '/en/quizzes/definitely-not-a-page'],
    ['species', '/en/species/definitely-not-a-page'],
    ['rescue-centers', '/en/rescue-centers/definitely-not-a-page?site=sealrescue'],
  ] as const) {
    test(`nonexistent ${route} slug renders not-found with noindex`, async ({ page }) => {
      await page.goto(`${BASE}${path}`)
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
        'content',
        /noindex/,
      )
      await expect(page.getByText('This page could not be found')).toBeVisible()
    })
  }

  test('section of the other site renders not-found (route guard)', async ({ page }) => {
    // rescue-centers — раздел sealrescue; на sealife (default на localhost) его нет.
    await page.goto(`${BASE}/en/rescue-centers`)
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      'content',
      /noindex/,
    )
    await expect(page.getByText('This page could not be found')).toBeVisible()
  })

  test('unknown locale prefix ends in 404', async ({ page }) => {
    const response = await page.goto(`${BASE}/xx/articles`)
    expect(response?.status()).toBe(404)
  })
})
