import { test, expect } from '@playwright/test'
import { installLeaderboardMock } from './helpers/mock-leaderboard'

/**
 * Regression guard for the game-over leaderboard: it must auto-scroll to the player's highlighted
 * row once the board is revealed.
 *
 * The bug (regression from the game-over interstitial, PRs #30/#31): `mountAfterPlay` renders the
 * board and calls `scrollToMe` WHILE the interstitial hides it (`#overlay.is-waiting .board {
 * display:none }`). A display:none element has no layout, so the scroll was a no-op and the board
 * opened at the top. The fix (core/leaderboard.js) makes `scrollToMe` wait until the list is
 * actually visible (`clientHeight > 0`) before centring the `.me` row.
 *
 * This runs the REAL module in a REAL browser (jsdom has no layout/rAF, so it can't cover this) and
 * reproduces game.js's endGame()→revealResult() sequence exactly. The leaderboard API is mocked
 * (installLeaderboardMock) → no DB/round needed.
 */

const GAME = 'http://localhost:3000/games/seal-hunt-v1/index.html?game=seal-the-hunter&lang=en'
const SLUG = 'seal-the-hunter'

// Minimal surface of core/leaderboard.js that the test drives (typed to avoid `any`).
interface LeaderboardModule {
  startRound(gameSlug: string): Promise<void>
  mountAfterPlay(
    container: HTMLElement,
    gameSlug: string,
    score: number,
    t: (k: string) => string,
  ): Promise<void>
}

test.describe('Seal The Hunter — leaderboard auto-scroll to the player', () => {
  test('jumps to the highlighted row after the interstitial reveals the board', async ({ page }) => {
    await installLeaderboardMock(page, { rank: 40, total: 120 })

    await page.goto(GAME)
    await expect(page.locator('#overlay')).toBeVisible()
    await page.waitForFunction(() => Boolean((window as unknown as { SealI18n?: unknown }).SealI18n))

    // Phase 1 — endGame(): the interstitial hides the board while we submit + render in the
    // background, then mount the real board via the real module (its scrollToMe runs here, hidden).
    await page.evaluate(async (slug) => {
      // Runtime, same-origin URL (served by the dev server) — not a build-time module. The variable
      // keeps tsc from trying to resolve it as a filesystem import; it loads the REAL client module.
      const spec = '/games/seal-hunt-v1/core/leaderboard.js'
      const mod = (await import(/* @vite-ignore */ spec)) as unknown as LeaderboardModule
      const overlay = document.getElementById('overlay') as HTMLElement
      const board = document.getElementById('board') as HTMLElement
      overlay.classList.add('is-waiting')
      await mod.startRound(slug) // obtain the (mocked) play-token, like a real round start
      await mod.mountAfterPlay(board, slug, 123, (k: string) => k) // stub t(): only DOM/scroll matter
    }, SLUG)

    const list = page.locator('#board .lb-list')
    const me = page.locator('#board .lb-row.me')
    await expect(me).toHaveCount(1) // player's row rendered + highlighted

    // While the interstitial still hides it, the list has no layout and cannot have scrolled.
    expect(
      await page.evaluate(
        () => (document.querySelector('#board .lb-list') as HTMLElement).clientHeight,
      ),
    ).toBe(0)
    expect(await list.evaluate((el) => (el as HTMLElement).scrollTop)).toBe(0)

    // Phase 2 — revealResult(): drop the interstitial → the board becomes visible.
    await page.evaluate(() => document.getElementById('overlay')?.classList.remove('is-waiting'))

    // The fix: scrollToMe was waiting for visibility → now it centres the player's row.
    await page.waitForFunction(() => {
      const l = document.querySelector('#board .lb-list') as HTMLElement | null
      return Boolean(l) && l!.clientHeight > 0 && l!.scrollTop > 0
    })

    // The highlighted row is inside the list's visible viewport (i.e. actually jumped to it).
    const meVisibleInList = await page.evaluate(() => {
      const l = document.querySelector('#board .lb-list') as HTMLElement
      const m = document.querySelector('#board .lb-row.me') as HTMLElement
      const lr = l.getBoundingClientRect()
      const mr = m.getBoundingClientRect()
      return mr.top >= lr.top - 2 && mr.bottom <= lr.bottom + 2
    })
    expect(meVisibleInList).toBe(true)
  })
})
