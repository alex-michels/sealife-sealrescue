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

/**
 * Хуки, поднимающие Payload, живут дольше дефолтных 30 с: `getPayload()` тянет схему из БД
 * (drizzle push), и это регулярно 20+ секунд. На дефолте хук падал по таймауту раз в несколько
 * полных прогонов — и выглядело это как «флака в проверке canonical», хотя сам тест ни при чём.
 * Int-спеки давно стоят на 120 с; e2e просто забыли.
 */
const BOOT_TIMEOUT = 120_000

test.beforeAll(async () => {
  test.setTimeout(BOOT_TIMEOUT)
  payload = await getPayload({ config: await config })

  // CR-01: фикстура ПЕРЕВЕДЕНА явно, вторым вызовом с указанной локалью. Раньше она создавалась
  // без `locale`, попадала в исходную локаль и «существовала» во второй только за счёт
  // locale-fallback — то есть перекрёстные alternates ниже доказывали утечку, а не перевод.
  const pub = await payload.create({
    collection: 'content',
    locale: 'ru',
    data: { type: 'article', title: `${RUN} pub`, slug: `${RUN}-pub`, _status: 'published' },
  })
  await payload.update({
    collection: 'content',
    id: pub.id,
    locale: 'en',
    data: { title: `${RUN} pub EN` },
  })

  await payload.create({
    collection: 'content',
    locale: 'ru',
    data: { type: 'article', title: `${RUN} draft`, slug: `${RUN}-draft`, _status: 'draft' },
  })

  // Непереведённая фикстура — негативный случай CR-01.
  await payload.create({
    collection: 'content',
    locale: 'ru',
    data: {
      type: 'article',
      title: `${RUN} только ru`,
      slug: `${RUN}-onelocale`,
      _status: 'published',
    },
  })
})

test.afterAll(async () => {
  test.setTimeout(BOOT_TIMEOUT)
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

  test('CR-01: непереведённый документ — 404 в чужой локали и без hreflang на неё', async ({
    page,
  }) => {
    // Раньше эта страница отдавала 200 с русским текстом под <html lang="en"> и объявляла себя
    // английской версией. Теперь её в английской локали просто нет.
    const missing = await page.goto(`${BASE}/en/${RUN}-onelocale`)
    expect(missing?.status()).toBe(404)

    // А в своей локали она есть и НЕ рекламирует несуществующую английскую альтернативу.
    const own = await page.goto(`${BASE}/ru/${RUN}-onelocale`)
    expect(own?.status()).toBe(200)
    expect(await altHref(page, 'ru')).toBe(`https://sealife.info/ru/${RUN}-onelocale`)
    await expectNoAlt(page, 'en')
    // x-default не может указывать на локаль, которой нет.
    expect(await altHref(page, 'x-default')).toBe(`https://sealife.info/ru/${RUN}-onelocale`)
  })

  /**
   * CR-02: канонический роут `/[locale]/[slug]` обслуживает `content` — коллекцию sealife.
   * До гейта каждая опубликованная статья резолвилась и на sealrescue.info, причём canonical
   * строится от ЗАПРОШЕННОГО хоста: один документ самоканонизировался на двух доменах.
   * Списочные роуты этой дыры не имели — они идут через `getSection()`.
   */
  test('CR-02: контентный slug на чужом сайте отдаёт 404, а не вторую копию', async ({ page }) => {
    const own = await page.goto(`${BASE}/en/${RUN}-pub`)
    expect(own?.status(), 'на sealife страница есть').toBe(200)

    const foreign = await page.goto(`${BASE}/en/${RUN}-pub?site=sealrescue`)
    expect(foreign?.status(), 'на sealrescue её быть не должно').toBe(404)
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

    // CR-01: непереведённый документ подаётся ТОЛЬКО в своей локали — ни <loc>, ни
    // hreflang-альтернативы для локали, где его нет. Иначе карта сайта зовёт краулер на 404.
    expect(xml).toContain(`<loc>https://sealife.info/ru/${RUN}-onelocale</loc>`)
    expect(xml).not.toContain(`<loc>https://sealife.info/en/${RUN}-onelocale</loc>`)
    expect(xml).not.toContain(
      `<xhtml:link rel="alternate" hreflang="en" href="https://sealife.info/en/${RUN}-onelocale" />`,
    )
    // CR-09: разделы сайта тоже подаются — раньше в карте не было ни одного.
    for (const section of ['articles', 'news', 'memes', 'games', 'species']) {
      expect(xml, `раздел ${section}`).toContain(`<loc>https://sealife.info/en/${section}</loc>`)
    }
    // ...кроме разделов на выдуманных данных: quizzes рендерится из `sampleQuizzes`.
    expect(xml, 'мок-раздел в карте не нужен').not.toContain(
      '<loc>https://sealife.info/en/quizzes</loc>',
    )
    // Legal — единственные страницы, живущие ещё и на /de (§5 DDG / §18 MStV).
    expect(xml).toContain('<loc>https://sealife.info/de/legal-notice</loc>')
    expect(xml).toContain('<loc>https://sealife.info/ru/privacy</loc>')
    // ...но /de существует ТОЛЬКО у legal: контентной страницы под ним быть не может.
    expect(xml).not.toContain(`https://sealife.info/de/${RUN}-pub`)
    expect(xml).not.toContain('<loc>https://sealife.info/de/articles</loc>')
  })

  test('sealrescue: свои разделы и legal, без sealife-контента', async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml?site=sealrescue`)
    const xml = await res.text()

    expect(xml).toContain('<loc>https://sealrescue.info/ru</loc>')

    // CR-09: главное приобретение — /what-to-do теперь подаётся. Ради него второй сайт и есть,
    // а раньше в карте sealrescue была буквально одна главная.
    for (const locale of LOCALES) {
      expect(xml, `what-to-do (${locale})`).toContain(
        `<loc>https://sealrescue.info/${locale}/what-to-do</loc>`,
      )
    }
    expect(xml).toContain('<loc>https://sealrescue.info/de/legal-notice</loc>')

    // ⚠️ Каталог центров НЕ подаётся вовсе — ни список, ни детали. До M2-T02 он рендерит
    // выдуманные центры с рабочими на вид телефонами и «штампом проверки»: позвать туда краулер
    // значит нарушить инвариант №7 на аварийном пути. Одного исключения деталей было бы мало —
    // списочная страница на них ссылается, и краулер дошёл бы в один шаг.
    expect(xml, 'мок-каталог центров не подаём').not.toContain('rescue-centers')

    // Раздела rescue-news больше нет (MOCK-04).
    expect(xml).not.toContain('rescue-news')
    // Чужой домен и чужой контент — по-прежнему нет.
    expect(xml).not.toContain('sealife.info')
    expect(xml).not.toContain(`${RUN}-pub`)
  })
})

test.describe('robots.txt (CR-09)', () => {
  for (const [site, host] of [
    ['sealife', 'https://sealife.info'],
    ['sealrescue', 'https://sealrescue.info'],
  ] as const) {
    test(`${site}: указывает на карту СВОЕГО домена`, async ({ request }) => {
      const res = await request.get(`${BASE}/robots.txt?site=${site}`)
      expect(res.status()).toBe(200)
      expect(res.headers()['content-type']).toContain('text/plain')

      const txt = await res.text()
      expect(txt).toContain(`Sitemap: ${host}/sitemap.xml`)
      expect(txt).toContain('Disallow: /admin')
      // Медиа отдаётся приложением и индексировать его нужно. Проверяем НАЛИЧИЕ правила, а не
      // порядок строк: побеждает более длинное совпадение (RFC 9309), порядок не значит ничего —
      // тест на порядок закреплял бы несуществующее требование.
      expect(txt).toContain('Allow: /api/media/')
      expect(txt).toContain('Disallow: /api/')
      // styleguide НЕ запрещаем: у него noindex, а запрет обхода помешал бы краулеру это увидеть.
      expect(txt).not.toContain('styleguide')
    })
  }
})
