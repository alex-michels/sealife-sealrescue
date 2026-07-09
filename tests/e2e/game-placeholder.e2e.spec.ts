import { test, expect, type Page } from '@playwright/test'

/**
 * SH-14: standalone-заглушка «Coming soon» (админ-тумблер games.standaloneComingSoon).
 *
 * Контракт клиентов (game.js обеих игр):
 *  - ЯВНЫЙ `{ standalone: false }` от /api/game-config + standalone-контекст → заглушка:
 *    Seal Hunter — attract-фон с плавающей рыбой БЕЗ тюленя/таймера/очков/имён;
 *    Seal Run — статичный подводный фон БЕЗ сущностей; у обеих — надпись «Coming soon»;
 *  - сетевая ошибка → fail-open (игра как обычно);
 *  - во фрейме (embedded) флаг игнорируется — заглушки не бывает.
 *
 * Конфиг мокается на уровне сети (page.route) — реальное состояние тумблера в БД
 * не трогаем, спека не зависит от порядка прогонов.
 */

const HUNT = 'http://localhost:3000/games/seal-hunt-v1/index.html?game=seal-the-hunter&lang=en'
const RUN = 'http://localhost:3000/games/seal-run-v1/index.html'

type PlaceholderGlobals = { __placeholder?: boolean; __preyCount?: number }

async function mockConfig(page: Page, standalone: boolean) {
  await page.route('**/api/game-config*', (route) => route.fulfill({ json: { standalone } }))
}

test.describe('Seal The Hunter — standalone-заглушка', () => {
  test('flag off → Coming soon + рыба плавает, HUD/оверлея/тюленя нет', async ({ page }) => {
    await mockConfig(page, false)
    await page.goto(HUNT)

    await expect(page.locator('#comingSoon')).toBeVisible()
    await expect(page.locator('#comingSoon')).toContainText(/coming\s+soon/i)
    await expect(page.locator('#overlay')).toBeHidden()
    await expect(page.locator('#hud')).toBeHidden()
    await expect(page.locator('body')).toHaveClass(/placeholder/)
    expect(
      await page.evaluate(() => (window as unknown as PlaceholderGlobals).__placeholder),
    ).toBe(true)

    // Attract-режим живой: добыча спавнится и плавает (сим работает, тюлень не рисуется —
    // рендер ветвится на PLACEHOLDER.active, см. game.js drawFrame).
    await expect
      .poll(() => page.evaluate(() => (window as unknown as PlaceholderGlobals).__preyCount ?? 0), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0)
  })

  test('ошибка сети конфига → fail-open: игра как обычно', async ({ page }) => {
    await page.route('**/api/game-config*', (route) => route.abort())
    await page.goto(HUNT)

    await expect(page.locator('#overlay')).toBeVisible()
    await expect(page.locator('#comingSoon')).toBeHidden()
    await expect(page.locator('#btnStart')).toBeVisible()
  })

  test('во фрейме флаг игнорируется — заглушки нет даже при off', async ({ page }) => {
    await mockConfig(page, false) // перехват действует и на запросы из фрейма
    await page.setContent(
      `<iframe id="game" style="width:900px;height:640px;border:0" src="${HUNT}"></iframe>`,
    )
    const frame = page.frameLocator('#game')
    await expect(frame.locator('#overlay')).toBeVisible()
    await expect(frame.locator('#comingSoon')).toBeHidden()
  })
})

test.describe('Seal Run — standalone-заглушка', () => {
  test('flag off → Coming soon на подводном фоне, меню нет', async ({ page }) => {
    await mockConfig(page, false)
    await page.goto(RUN)

    await expect(page.locator('#coming-soon')).toBeVisible()
    await expect(page.locator('#coming-soon')).toContainText(/coming\s+soon/i)
    await expect(page.locator('#menu')).toBeHidden()
    await expect(page.locator('#start')).toBeHidden()

    // Фон реально нарисован (canvas непрозрачный в центре), без Phaser и сущностей.
    const painted = await page.evaluate(() => {
      const c = document.getElementById('coming-soon-bg') as HTMLCanvasElement
      const px = c.getContext('2d')!.getImageData(c.width / 2, c.height / 2, 1, 1).data
      return px[3] > 0
    })
    expect(painted).toBe(true)
  })

  test('flag on → игра как обычно (меню со «Старт»)', async ({ page }) => {
    await mockConfig(page, true)
    await page.goto(RUN)

    await expect(page.locator('#menu')).toBeVisible()
    await expect(page.locator('#start')).toBeVisible()
    await expect(page.locator('#coming-soon')).toBeHidden()
  })
})
