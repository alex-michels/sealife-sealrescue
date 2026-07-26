import { test, expect, type Page } from '@playwright/test'
import { locales, type Locale } from '@/i18n/config'
import { sites, type SiteId } from '@/site/config'
import { navSectionsForSite } from '@/site/sections'
import { legalNav, legalHref } from '../../src/site/legal.js'

/**
 * Smoke-обход навигации — последний невыполненный пункт **M0-T19**.
 *
 * Раньше `sectionDefs` проверялся только структурно (`tests/unit/sections-legal.unit.spec.ts`):
 * unit знает, что раздел ОБЪЯВЛЕН, и ничего не знает о том, открывается ли он. Это ровно тот
 * зазор, в который проваливаются мёртвые пункты меню — так уже случилось при снятии DE, когда
 * кнопка языка осталась в разметке игры, а словаря за ней больше не было.
 *
 * Зачем это нужнее СЕЙЧАС, чем во времена дизайн-мока: под пятью разделами предстоит по очереди
 * менять источник данных с `@/mock/sample` на Payload. Полусделанный порт должен выглядеть как
 * красный тест, а не как пустая страница, которую никто не открыл.
 *
 * Контракт нарочно узкий и НЕ зависит от контента:
 *  - меню в DOM == `navSectionsForSite()` (ни лишних пунктов, ни потерянных);
 *  - каждая ссылка меню отвечает 200 и даёт непустой единственный <h1>;
 *  - legal-ссылки футера отвечают 200 на каждой контент-локали.
 * Никаких утверждений о конкретных текстах карточек: тест обязан пережить и моки, и реальные
 * записи, и пустую БД — иначе он умрёт вместе с моками, вместо того чтобы страховать переезд.
 */

const BASE = 'http://localhost:3000'

/** На localhost сайт выбирается query-override'ом (см. `proxy.ts`); sealife — дефолт. */
const withSite = (path: string, site: SiteId) =>
  site === 'sealife'
    ? `${BASE}${path}`
    : `${BASE}${path}${path.includes('?') ? '&' : '?'}site=${site}`

/** Ссылки основной навигации в порядке DOM. */
async function navHrefs(page: Page, locale: Locale) {
  const nav = page.getByRole('navigation', { name: { ru: 'Разделы', en: 'Sections' }[locale] })
  await expect(nav).toBeVisible()
  return nav.getByRole('link').all()
}

for (const site of Object.keys(sites) as SiteId[]) {
  for (const locale of locales) {
    test.describe(`Навигация ${site} /${locale}`, () => {
      test('меню в DOM совпадает с navSectionsForSite (ни лишних пунктов, ни потерянных)', async ({
        page,
      }) => {
        await page.goto(withSite(`/${locale}`, site))

        const expected = navSectionsForSite(site)
        const links = await navHrefs(page, locale)

        expect(
          links.length,
          `${site}/${locale}: в меню ${links.length} ссылок, в sections.ts — ${expected.length}`,
        ).toBe(expected.length)

        for (const [i, section] of expected.entries()) {
          await expect(links[i]).toHaveAttribute('href', `/${locale}/${section.slug}`)
          await expect(links[i]).toHaveText(section.label[locale])
        }
      })

      for (const section of navSectionsForSite(site)) {
        test(`раздел «${section.slug}» открывается: 200 + непустой h1`, async ({ page }) => {
          const response = await page.goto(withSite(`/${locale}/${section.slug}`, site))

          expect(response?.status(), `${site}/${locale}/${section.slug}`).toBe(200)

          const h1 = page.getByRole('heading', { level: 1 })
          await expect(h1).toHaveCount(1)
          await expect(h1).not.toBeEmpty()
        })
      }

      test('legal-ссылки футера отвечают 200', async ({ request }) => {
        for (const { slug } of legalNav[locale]) {
          const res = await request.get(withSite(legalHref(locale, slug), site))
          expect(res.status(), `${site} ${locale}/${slug}`).toBe(200)
        }
      })
    })
  }
}
