import { test, expect, type Page } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config.js'

/**
 * QA-20: hreflang/canonical на страницах + контракт sitemap.xml (M0-T10).
 *
 * Инварианты (CLAUDE.md / localization.md): абсолютные PRODUCTION-URL (мультидомен —
 * прод-домен сайта, не localhost), перекрёстные alternates всех трёх локалей,
 * x-default → en; в sitemap — ТОЛЬКО published; пока только sealife-контент
 * (rescue-centers добавятся в M2 — тогда обновить и тест).
 *
 * Фикстуры сидятся напрямую через Payload (как tests/helpers/seedUser.ts).
 */

const BASE = 'http://localhost:3000'
const RUN = `qa20-${Date.now()}`
const LOCALES = ['ru', 'en', 'de'] as const

let payload: Payload

test.beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await payload.create({
    collection: 'content',
    data: { type: 'article', title: `${RUN} pub`, slug: `${RUN}-pub`, _status: 'published' },
  })
  await payload.create({
    collection: 'content',
    data: { type: 'article', title: `${RUN} draft`, slug: `${RUN}-draft`, _status: 'draft' },
  })
})

test.afterAll(async () => {
  await payload.delete({ collection: 'content', where: { slug: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
})

const altHref = (page: Page, hreflang: string) =>
  page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`).first().getAttribute('href')

test.describe('hreflang / canonical на страницах', () => {
  for (const locale of LOCALES) {
    test(`главная /${locale}: canonical своей локали + перекрёстные alternates + x-default`, async ({
      page,
    }) => {
      await page.goto(`${BASE}/${locale}`)
      // Прод-домен, не localhost (мультидомен: origin из конфига сайта).
      await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute(
        'href',
        `https://sealife.info/${locale}`,
      )
      for (const alt of LOCALES) {
        expect(await altHref(page, alt), `hreflang=${alt}`).toBe(`https://sealife.info/${alt}`)
      }
      expect(await altHref(page, 'x-default')).toBe('https://sealife.info/en')
    })
  }

  test('страница раздела: alternates наследуют путь (/ru/articles)', async ({ page }) => {
    await page.goto(`${BASE}/ru/articles`)
    await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute(
      'href',
      'https://sealife.info/ru/articles',
    )
    expect(await altHref(page, 'de')).toBe('https://sealife.info/de/articles')
    expect(await altHref(page, 'x-default')).toBe('https://sealife.info/en/articles')
  })

  test('контентная страница: canonical slug общий для локалей', async ({ page }) => {
    await page.goto(`${BASE}/en/${RUN}-pub`)
    await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute(
      'href',
      `https://sealife.info/en/${RUN}-pub`,
    )
    expect(await altHref(page, 'ru')).toBe(`https://sealife.info/ru/${RUN}-pub`)
  })
})

test.describe('sitemap.xml', () => {
  test('sealife: главная ×3 локали, published-контент с hreflang, черновики исключены', async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/sitemap.xml`)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('application/xml')
    const xml = await res.text()

    // Главная в каждой локали.
    for (const locale of LOCALES) {
      expect(xml).toContain(`<loc>https://sealife.info/${locale}</loc>`)
    }
    // Published-контент: loc ×3 локали + x-default-альтернатива.
    for (const locale of LOCALES) {
      expect(xml).toContain(`<loc>https://sealife.info/${locale}/${RUN}-pub</loc>`)
    }
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="x-default" href="https://sealife.info/en/${RUN}-pub" />`,
    )
    // Черновик НЕ попадает (только _status=published).
    expect(xml).not.toContain(`${RUN}-draft`)
  })

  test('sealrescue: только главная, свой домен, без sealife-контента (до M2)', async ({
    request,
  }) => {
    const res = await request.get(`${BASE}/sitemap.xml?site=sealrescue`)
    const xml = await res.text()
    expect(xml).toContain('<loc>https://sealrescue.info/ru</loc>')
    expect(xml).not.toContain('sealife.info')
    expect(xml).not.toContain(`${RUN}-pub`)
  })
})
