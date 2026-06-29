import { test, expect } from '@playwright/test'

/**
 * Seal The Hunter — standalone (sealthehunter.online) vs embedded (iframe on sealife.*).
 *
 * The game runs the SAME files in both contexts and branches on `STANDALONE = window.self ===
 * window.top` (public/games/seal-hunt-v1/i18n.js). These tests lock in the *differences* so the
 * embedded experience can't silently inherit the alpha-landing UI (and vice-versa).
 *
 * No DB / no game round needed — only the start overlay is exercised.
 */

const GAME = 'http://localhost:3000/games/seal-hunt-v1/index.html?game=seal-the-hunter'
const FEEDBACK = 'feedback@sealthehunter.online'

// Typed accessor for the game's i18n global (avoids `any`).
type SealGlobal = { SealI18n: { standalone: boolean; lang: string } }

test.describe('Seal The Hunter — standalone (opened directly, not framed)', () => {
  test('shows language switcher, alpha notice and feedback contact', async ({ page }) => {
    await page.goto(`${GAME}&lang=en`)

    await expect(page.locator('#overlay')).toBeVisible()
    expect(
      await page.evaluate(() => (window as unknown as SealGlobal).SealI18n.standalone),
    ).toBe(true)

    // RU/EN/DE switcher visible.
    await expect(page.locator('#langSwitch')).toBeVisible()
    for (const l of ['ru', 'en', 'de']) {
      await expect(page.locator(`.lang-btn[data-lang="${l}"]`)).toBeVisible()
    }
    await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveAttribute('aria-pressed', 'true')

    // Alpha notice + displayed feedback contact (mailto, not a form).
    await expect(page.locator('#alphaNotice')).toBeVisible()
    await expect(page.locator('#alphaNotice')).toContainText(/alpha/i)
    const feedback = page.locator('#feedbackInvite')
    await expect(feedback).toBeVisible()
    await expect(feedback.locator(`a[href="mailto:${FEEDBACK}"]`)).toHaveText(FEEDBACK)

    // Assigned anonymous username greeting is rendered.
    await expect(page.locator('#hello')).not.toBeEmpty()
  })

  test('initial language follows ?lang= and marks the active button', async ({ page }) => {
    await page.goto(`${GAME}&lang=de`)
    await expect(page.locator('.lang-btn[data-lang="de"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  })

  test('switching language updates UI, persists only on explicit choice, and survives reload', async ({
    page,
  }) => {
    await page.goto(`${GAME}&lang=en`)
    await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveAttribute('aria-pressed', 'true')
    const helloEn = (await page.locator('#hello').textContent())?.trim() ?? ''
    expect(helloEn).not.toEqual('')

    await page.locator('.lang-btn[data-lang="ru"]').click()

    // UI re-localizes live.
    await expect(page.locator('.lang-btn[data-lang="ru"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    await expect(page.locator('#alphaNotice')).toContainText('альфа')
    await expect(page.locator('#hello')).not.toHaveText(helloEn) // greeting re-localized

    // Persisted ONLY after the explicit click (COMPLIANCE: language stored after explicit choice).
    expect(await page.evaluate(() => localStorage.getItem('seal_hunt_lang'))).toEqual('ru')

    // Reload WITHOUT ?lang= → the saved choice wins over browser language.
    await page.goto(GAME)
    await expect(page.locator('.lang-btn[data-lang="ru"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  })
})

test.describe('Seal The Hunter — embedded (inside an iframe, like sealife.*)', () => {
  test('hides switcher + alpha notice + feedback; language comes from ?lang=', async ({ page }) => {
    // Frame the game exactly like the site wrapper does (src/app/.../games/[slug]/page.tsx).
    await page.setContent(
      `<iframe id="game" style="width:900px;height:640px;border:0" src="${GAME}&lang=en"></iframe>`,
    )
    const frame = page.frameLocator('#game')

    // Wait for the game to initialise, then assert it knows it is NOT standalone.
    await expect(frame.locator('#overlay')).toBeVisible()
    const inner = page.frames().find((f) => f.url().includes('seal-hunt-v1'))
    expect(inner).toBeTruthy()
    expect(
      await inner!.evaluate(() => (window as unknown as SealGlobal).SealI18n.standalone),
    ).toBe(false)

    // The alpha-landing UI must be absent.
    await expect(frame.locator('#langSwitch')).toBeHidden()
    await expect(frame.locator('#alphaNotice')).toBeHidden()
    await expect(frame.locator('#feedbackInvite')).toBeHidden()

    // Core game still works: language from ?lang=, greeting rendered.
    expect(await inner!.evaluate(() => (window as unknown as SealGlobal).SealI18n.lang)).toEqual('en')
    await expect(frame.locator('#hello')).not.toBeEmpty()
  })
})
