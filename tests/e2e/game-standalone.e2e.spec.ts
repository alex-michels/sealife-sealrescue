import { test, expect } from '@playwright/test'

/**
 * Seal The Hunter — standalone (opened by direct URL) vs embedded (iframe on sealife.*).
 *
 * The game runs the SAME files in both contexts and branches on `STANDALONE = window.self ===
 * window.top` (public/games/seal-hunt-v1/i18n.js). These tests lock in the *difference* — the
 * language switcher — so the embedded experience can't silently inherit standalone-only UI.
 *
 * The public game alpha is over: the alpha notice and the feedback mailto contact it carried are
 * gone from the markup and from the dictionary. The operator contact point lives in the site's
 * Impressum (COMPLIANCE), never in the game, so no mailto may come back here.
 *
 * The game speaks the site's languages and no others: the dictionary is RU/EN only since German
 * was dropped as a site language, so `?lang=de` is invalid input and a German browser gets EN.
 *
 * No DB / no game round needed — only the start overlay is exercised.
 */

const GAME = 'http://localhost:3000/games/seal-hunt-v1/index.html?game=seal-the-hunter'

// Typed accessor for the game's i18n global (avoids `any`).
type SealGlobal = { SealI18n: { standalone: boolean; lang: string } }

test.describe('Seal The Hunter — standalone (opened directly, not framed)', () => {
  test('shows the language switcher and no leftover alpha UI', async ({ page }) => {
    await page.goto(`${GAME}&lang=en`)

    await expect(page.locator('#overlay')).toBeVisible()
    expect(
      await page.evaluate(() => (window as unknown as SealGlobal).SealI18n.standalone),
    ).toBe(true)

    // RU/EN switcher visible — exactly the site's languages, nothing else.
    await expect(page.locator('#langSwitch')).toBeVisible()
    for (const l of ['ru', 'en']) {
      await expect(page.locator(`.lang-btn[data-lang="${l}"]`)).toBeVisible()
    }
    await expect(page.locator('#langSwitch .lang-btn')).toHaveCount(2)
    // German is gone from the game dictionary — no dead DE button may survive in the markup.
    await expect(page.locator('.lang-btn[data-lang="de"]')).toHaveCount(0)
    await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveAttribute('aria-pressed', 'true')

    // The alpha is over: its notice and feedback contact are gone from the markup entirely,
    // and the game offers no email contact at all (COMPLIANCE: contact lives in the Impressum).
    await expect(page.locator('#alphaNotice')).toHaveCount(0)
    await expect(page.locator('#feedbackInvite')).toHaveCount(0)
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)

    // Assigned anonymous username greeting is rendered.
    await expect(page.locator('#hello')).not.toBeEmpty()
  })

  test('initial language follows ?lang= and marks the active button', async ({ page }) => {
    await page.goto(`${GAME}&lang=ru`)
    await expect(page.locator('.lang-btn[data-lang="ru"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  })

  test('unsupported ?lang=de falls back to the browser language, never German', async ({
    page,
  }) => {
    // `validLang` accepts ru/en only; a leftover German link must not render a half-translated UI.
    await page.goto(`${GAME}&lang=de`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => (window as unknown as SealGlobal).SealI18n.lang)).toEqual('en')
  })

  test.describe('German browser', () => {
    test.use({ locale: 'de-DE' })

    test('gets EN, same policy as the site (pickLocale: non-Russian → en)', async ({ page }) => {
      await page.goto(GAME)
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      // English dictionary really applied, not just the html@lang attribute.
      await expect(page.locator('#overlay h1')).toHaveText('Seal The Hunter')
    })
  })

  test('switching language updates UI, persists only on explicit choice, and survives reload', async ({
    page,
  }) => {
    await page.goto(`${GAME}&lang=en`)
    await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('#overlay h1')).toHaveText('Seal The Hunter')
    const helloEn = (await page.locator('#hello').textContent())?.trim() ?? ''
    expect(helloEn).not.toEqual('')

    await page.locator('.lang-btn[data-lang="ru"]').click()

    // UI re-localizes live.
    await expect(page.locator('.lang-btn[data-lang="ru"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.lang-btn[data-lang="en"]')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    await expect(page.locator('#overlay h1')).toHaveText('Тюль-Охотник') // static strings re-applied
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
  test('hides the language switcher; language comes from ?lang=', async ({ page }) => {
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

    // Standalone-only UI must be absent: the switcher is hidden, and the retired alpha notice
    // and feedback contact are not in the DOM at all — nothing left to un-hide by mistake.
    await expect(frame.locator('#langSwitch')).toBeHidden()
    await expect(frame.locator('#alphaNotice')).toHaveCount(0)
    await expect(frame.locator('#feedbackInvite')).toHaveCount(0)
    await expect(frame.locator('a[href^="mailto:"]')).toHaveCount(0)

    // Core game still works: language from ?lang=, greeting rendered.
    expect(await inner!.evaluate(() => (window as unknown as SealGlobal).SealI18n.lang)).toEqual('en')
    await expect(frame.locator('#hello')).not.toBeEmpty()
  })
})
