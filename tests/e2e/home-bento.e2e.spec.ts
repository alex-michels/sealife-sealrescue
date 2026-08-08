import { test, expect } from '@playwright/test'
import { locales } from '@/i18n/config'
import { sites } from '@/site/config'
import { t } from '@/i18n/ui'
import { BENTO_SLOTS } from '@/content/bento'
import { sampleQuizzes } from '@/mock/sample'

/**
 * **M1-T05** — bento-хаб главной sealife.
 *
 * Проверяется то, что нельзя проверить ни unit-, ни int-тестом: что иерархия §6a реально доехала
 * до страницы в нужном ПОРЯДКЕ, что пустые плитки остались на месте (а не исчезли, оставив дыры),
 * и что на индексируемой главной нет ни одного выдуманного квиза.
 */

const BASE = 'http://localhost:3000'

test.describe('Главная sealife: bento «Сегодня»', () => {
  for (const locale of locales) {
    test(`/${locale}: шесть плиток в порядке приоритета §6a`, async ({ page }) => {
      await page.goto(`${BASE}/${locale}`)

      const tiles = page.locator('.bento > li[data-slot]')
      await expect(tiles).toHaveCount(BENTO_SLOTS.length)

      // Порядок DOM = визуальный порядок = порядок для клавиатуры и скринридера. Именно это
      // отличает bento с иерархией от masonry, который запрещает §16.
      expect(await tiles.evaluateAll((els) => els.map((el) => el.getAttribute('data-slot')))).toEqual(
        [...BENTO_SLOTS],
      )
    })

    test(`/${locale}: каждая плитка — ссылка, включая пустую`, async ({ page }) => {
      await page.goto(`${BASE}/${locale}`)

      for (const slot of BENTO_SLOTS) {
        const link = page.locator(`.bento > li[data-slot="${slot}"] a[href]`)
        // Пустое состояние тоже ведёт в раздел: §8 — пустой экран приглашает к действию,
        // а не отчитывается об отсутствии.
        await expect(link, `плитка ${slot} должна быть ссылкой`).toHaveCount(1)
      }
    })

    test(`/${locale}: заголовок остался ОДНИМ h1 = вордмарк, с кинетикой`, async ({ page }) => {
      await page.goto(`${BASE}/${locale}`)

      const h1 = page.getByRole('heading', { level: 1 })
      await expect(h1).toHaveCount(1)
      // Кинетика не имеет права добавлять текстовые узлы: ни пер-глифовых span, ни sr-only-дубля.
      await expect(h1).toHaveText(sites.sealife.brand[locale])
      await expect(h1).toHaveClass(/kinetic-wordmark/)
    })

    test(`/${locale}: на главной НЕТ выдуманных квизов`, async ({ page }) => {
      await page.goto(`${BASE}/${locale}`)

      // Раздел quizzes ещё на mock-данных (M1-T10), а у главной нет noindex и она стоит первой
      // записью в sitemap — то есть mock на ней обошёл бы СРАЗУ оба механизма CR-09.
      const quiz = page.locator('.bento > li[data-slot="quiz"]')
      await expect(quiz).toContainText(t(locale, 'bentoQuizSoon'))
      for (const q of sampleQuizzes) {
        await expect(page.locator('body')).not.toContainText(q.title[locale])
      }
    })

    test(`/${locale}: второго landmark «Разделы» не появилось`, async ({ page }) => {
      await page.goto(`${BASE}/${locale}`)

      // Этим именем уже назван landmark навигации в хедере. Второй такой же ломает и навигацию
      // по скринридеру, и strict-локатор в nav-smoke.
      const named = page.getByRole('navigation', {
        name: { ru: 'Разделы', en: 'Sections' }[locale],
      })
      await expect(named).toHaveCount(1)
      await expect(page.getByRole('heading', { name: t(locale, 'sectionsAll') })).toHaveCount(1)
    })
  }
})
