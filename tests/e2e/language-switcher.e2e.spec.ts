import { test, expect, type Page } from '@playwright/test'

/**
 * QA-24: LanguageSwitcher (DESIGN_BRIEF §9) — доступный disclosure-виджет.
 * Инварианты: свитчер видим (не прятать); названия ТЕКСТОМ (не флаги);
 * язык запоминается ТОЛЬКО по явному клику (TDDDG — cookie NEXT_LOCALE ставит
 * свитчер, не proxy); путь сохраняется при переключении локали.
 */

const BASE = 'http://localhost:3000'

const headerSwitcher = (page: Page) =>
  page.locator('header').locator('button[aria-haspopup="menu"]')
const menu = (page: Page) => page.locator('header nav[id][aria-label]')

const localeCookie = async (page: Page) => {
  const cookies = await page.context().cookies(BASE)
  return cookies.find((c) => c.name === 'NEXT_LOCALE')?.value ?? null
}

test.describe('LanguageSwitcher', () => {
  test('aria-контракт: haspopup/expanded, текстовые названия, aria-current у активной', async ({
    page,
  }) => {
    await page.goto(`${BASE}/en`)
    const button = headerSwitcher(page)
    await expect(button).toHaveAttribute('aria-haspopup', 'menu')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(menu(page)).toBeHidden()

    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(menu(page)).toBeVisible()

    // Языки — текстом (язык ≠ страна, без флагов); активная локаль помечена.
    const links = menu(page).getByRole('link')
    await expect(links).toHaveCount(3)
    const active = menu(page).locator('a[aria-current="true"]')
    await expect(active).toHaveAttribute('hreflang', 'en')
  })

  test('закрытие: Esc, клик вне, уход фокуса (Tab наружу)', async ({ page }) => {
    await page.goto(`${BASE}/en`)
    const button = headerSwitcher(page)

    await button.click()
    await expect(menu(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu(page)).toBeHidden()

    await button.click()
    await expect(menu(page)).toBeVisible()
    await page.locator('h1').first().click()
    await expect(menu(page)).toBeHidden()

    await button.click()
    await expect(menu(page)).toBeVisible()
    // Кнопка → 3 пункта меню → следующий Tab уводит фокус за пределы виджета.
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
    await expect(menu(page)).toBeHidden()
  })

  test('путь сохраняется при переключении; язык страницы меняется', async ({ page }) => {
    await page.goto(`${BASE}/en/articles`)
    await headerSwitcher(page).click()
    await menu(page).locator('a[hreflang="de"]').click()
    await expect(page).toHaveURL(`${BASE}/de/articles`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  })

  test('NEXT_LOCALE ставится ТОЛЬКО по явному клику (TDDDG)', async ({ page }) => {
    // Навигация и авто-редиректы cookie НЕ создают.
    await page.goto(`${BASE}/en`)
    await page.goto(`${BASE}/ru/articles`)
    await page.goto(`${BASE}/`)
    expect(await localeCookie(page)).toBeNull()

    // Явный выбор — создаёт; последующий заход на / уважает выбор (proxy: cookie > header).
    await headerSwitcher(page).click()
    await menu(page).locator('a[hreflang="de"]').click()
    await expect(page).toHaveURL(`${BASE}/de`)
    expect(await localeCookie(page)).toBe('de')

    await page.goto(`${BASE}/`)
    await expect(page).toHaveURL(`${BASE}/de`)
  })

  test('свитчер есть и в футере (меню открывается вверх)', async ({ page }) => {
    await page.goto(`${BASE}/ru`)
    const footerButton = page
      .getByRole('contentinfo')
      .locator('button[aria-haspopup="menu"]')
    await expect(footerButton).toBeVisible()
    await footerButton.click()
    await expect(
      page.getByRole('contentinfo').locator('nav[id][aria-label]'),
    ).toBeVisible()
  })
})
