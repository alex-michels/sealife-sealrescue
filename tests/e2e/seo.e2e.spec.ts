import { test, expect, type Page } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config.js'

/**
 * QA-20: hreflang/canonical на страницах + контракт sitemap.xml (M0-T10).
 *
 * Инварианты (CLAUDE.md / localization.md): абсолютные PRODUCTION-URL (мультидомен —
 * прод-домен сайта, не localhost), перекрёстные alternates обеих контент-локалей (ru/en),
 * x-default → en; в sitemap — ТОЛЬКО published; пока только sealife-контент
 * (rescue-centers добавятся в M2 — тогда обновить и тест).
 *
 * Два уровня локалей (src/i18n/alternates.ts): у КОНТЕНТНЫХ страниц alternates только ru/en —
 * `de` там был бы ссылкой на 404 и прямой SEO-ошибкой; у LEGAL-страниц набор шире (ru/en/de),
 * потому что немецкий Impressum/Datenschutz реально отдаётся.
 *
 * Фикстуры сидятся напрямую через Payload (как tests/helpers/seedUser.ts).
 */

const BASE = 'http://localhost:3000'
const RUN = `qa20-${Date.now()}`
const LOCALES = ['ru', 'en'] as const

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

/** Альтернативы такой локали быть не должно вовсе (не пустой href, а отсутствие тега). */
const expectNoAlt = (page: Page, hreflang: string) =>
  expect(page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`)).toHaveCount(0)

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
      // Немецкой главной не существует — объявлять её в hreflang нельзя.
      await expectNoAlt(page, 'de')
    })
  }

  test('страница раздела: alternates наследуют путь (/ru/articles)', async ({ page }) => {
    await page.goto(`${BASE}/ru/articles`)
    await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute(
      'href',
      'https://sealife.info/ru/articles',
    )
    expect(await altHref(page, 'en')).toBe('https://sealife.info/en/articles')
    expect(await altHref(page, 'x-default')).toBe('https://sealife.info/en/articles')
    await expectNoAlt(page, 'de')
  })

  test('контентная страница: canonical slug общий для локалей', async ({ page }) => {
    await page.goto(`${BASE}/en/${RUN}-pub`)
    await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute(
      'href',
      `https://sealife.info/en/${RUN}-pub`,
    )
    expect(await altHref(page, 'ru')).toBe(`https://sealife.info/ru/${RUN}-pub`)
    await expectNoAlt(page, 'de')
  })

  test('legal-страница: hreflang шире контентного — включает legal-only de', async ({ page }) => {
    await page.goto(`${BASE}/en/legal-notice`)
    await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute(
      'href',
      'https://sealife.info/en/legal-notice',
    )
    for (const alt of ['ru', 'en', 'de', 'x-default'] as const) {
      const target = alt === 'x-default' ? 'en' : alt
      expect(await altHref(page, alt), `hreflang=${alt}`).toBe(
        `https://sealife.info/${target}/legal-notice`,
      )
    }
  })

  test('немецкая legal-страница: canonical свой, /de', async ({ page }) => {
    await page.goto(`${BASE}/de/privacy`)
    await expect(page.locator('link[rel="canonical"]').first()).toHaveAttribute(
      'href',
      'https://sealife.info/de/privacy',
    )
    expect(await altHref(page, 'de')).toBe('https://sealife.info/de/privacy')
    expect(await altHref(page, 'x-default')).toBe('https://sealife.info/en/privacy')
  })
})

test.describe('sitemap.xml', () => {
  test('sealife: главная ×2 локали, published-контент с hreflang, черновики исключены', async ({
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
    // Published-контент: loc ×2 локали + x-default-альтернатива.
    for (const locale of LOCALES) {
      expect(xml).toContain(`<loc>https://sealife.info/${locale}/${RUN}-pub</loc>`)
    }
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="x-default" href="https://sealife.info/en/${RUN}-pub" />`,
    )
    // Черновик НЕ попадает (только _status=published).
    expect(xml).not.toContain(`${RUN}-draft`)
    // Карта — по контент-локалям: legal-страниц (и /de вместе с ними) в ней нет вообще.
    expect(xml).not.toContain('sealife.info/de')
    expect(xml).not.toContain('/legal-notice')
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
