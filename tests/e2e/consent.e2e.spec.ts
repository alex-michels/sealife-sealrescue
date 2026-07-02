import { test, expect, type Page } from '@playwright/test'

/**
 * QA-23 (КРИТИЧНО — §25 TDDDG / M0-T11): аналитика строго opt-in.
 *
 * Контракт:
 *  - до явного согласия скрипт Plausible НЕ запрашивается вовсе (network-ассерт);
 *  - «Принять» и «Отклонить» равнозначны (первый уровень, один стиль/размер);
 *  - выбор хранится ТОЛЬКО в consent-cookie `sl-consent` (versioned), НЕ в localStorage;
 *  - Accept подгружает скрипт сразу (без перезагрузки) и на каждой следующей загрузке;
 *  - отзыв так же прост, как согласие: страница Cookie-Settings из футера, отзыв
 *    выгружает уже загруженный скрипт (reload).
 *
 * Весь consent-стек рендерится только при заданном NEXT_PUBLIC_PLAUSIBLE_SRC:
 * в CI job `e2e` ставит фиктивный URL (домен .test не резолвится; здесь он
 * перехватывается роутом), локально без переменной спек пропускается —
 * CI остаётся точкой принуждения.
 */

const SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC
const BASE = 'http://localhost:3000'
const COOKIE = 'sl-consent'

test.skip(!SRC, 'NEXT_PUBLIC_PLAUSIBLE_SRC не задан — consent-стек выключен (в CI задан всегда)')

/** Перехват Plausible: считаем попытки загрузки, наружу ничего не уходит. */
async function instrument(page: Page): Promise<string[]> {
  const hits: string[] = []
  await page.route(`${SRC}**`, (route) => {
    hits.push(route.request().url())
    return route.fulfill({ contentType: 'application/javascript', body: '/* stub */' })
  })
  return hits
}

const consentCookie = async (page: Page) => {
  const cookies = await page.context().cookies(BASE)
  return cookies.find((c) => c.name === COOKIE)?.value ?? null
}

const localStorageKeys = (page: Page) => page.evaluate(() => Object.keys(window.localStorage))

test.describe('Consent / TDDDG', () => {
  test('до выбора: баннер с равнозначными кнопками, Plausible не запрашивается', async ({
    page,
  }) => {
    const hits = await instrument(page)
    await page.goto(`${BASE}/en`)

    const banner = page.getByRole('region', { name: 'Analytics consent' })
    await expect(banner).toBeVisible()
    const accept = banner.getByRole('button', { name: 'Accept' })
    const decline = banner.getByRole('button', { name: 'Decline' })
    await expect(accept).toBeVisible()
    await expect(decline).toBeVisible()

    // Равнозначность (Германия): оба на первом уровне, одинаковый стиль/размер.
    const styleOf = (el: Element) => {
      const s = getComputedStyle(el)
      return { font: s.fontSize, bg: s.backgroundColor, h: (el as HTMLElement).offsetHeight }
    }
    const a = await accept.evaluate(styleOf)
    const d = await decline.evaluate(styleOf)
    expect(a).toEqual(d)

    // «Подробнее» ведёт на локализованную cookie-страницу.
    await expect(banner.getByRole('link', { name: 'Learn more' })).toHaveAttribute(
      'href',
      '/en/cookies',
    )

    // Навигация без выбора: скрипт по-прежнему не запрашивается, баннер остаётся.
    await page.goto(`${BASE}/en/articles`)
    await expect(page.getByRole('region', { name: 'Analytics consent' })).toBeVisible()
    expect(hits).toHaveLength(0)
    expect(await consentCookie(page)).toBeNull()
  })

  test('Reject: consent-cookie=denied, скрипт не грузится ни сейчас, ни после перезагрузки', async ({
    page,
  }) => {
    const hits = await instrument(page)
    await page.goto(`${BASE}/en`)

    const banner = page.getByRole('region', { name: 'Analytics consent' })
    await banner.getByRole('button', { name: 'Decline' }).click()
    await expect(banner).toBeHidden()

    expect(await consentCookie(page)).toBe('denied.v1')
    // Выбор НЕ дублируется в localStorage (инвариант №4 / COMPLIANCE §3).
    expect(await localStorageKeys(page)).toEqual([])

    await page.reload()
    await expect(page.getByRole('region', { name: 'Analytics consent' })).toBeHidden()
    expect(hits).toHaveLength(0)
  })

  test('Accept: consent-cookie=granted, Plausible грузится сразу и на следующих загрузках', async ({
    page,
  }) => {
    const hits = await instrument(page)
    await page.goto(`${BASE}/en`)

    const banner = page.getByRole('region', { name: 'Analytics consent' })
    await banner.getByRole('button', { name: 'Accept' }).click()
    await expect(banner).toBeHidden()

    // Скрипт подгружается сразу, без перезагрузки (CONSENT_EVENT).
    await expect.poll(() => hits.length).toBeGreaterThan(0)
    expect(await consentCookie(page)).toBe('granted.v1')
    expect(await localStorageKeys(page)).toEqual([])

    const before = hits.length
    await page.reload()
    await expect.poll(() => hits.length).toBeGreaterThan(before)
  })

  test('Cookie-Settings из футера: статус виден, отзыв одним кликом выгружает скрипт', async ({
    page,
  }) => {
    const hits = await instrument(page)
    await page.goto(`${BASE}/en`)
    await page
      .getByRole('region', { name: 'Analytics consent' })
      .getByRole('button', { name: 'Accept' })
      .click()
    await expect.poll(() => hits.length).toBeGreaterThan(0)

    // Страница настроек доступна из футера каждой страницы (legal-ссылка «Cookies»).
    await page.getByRole('contentinfo').getByRole('link', { name: 'Cookies', exact: true }).click()
    await expect(page).toHaveURL(`${BASE}/en/cookies`)
    await expect(page.getByText('analytics enabled')).toBeVisible()

    // Отзыв так же прост, как согласие: одна кнопка. Отзыв выгружает Plausible (reload).
    const loadedBefore = hits.length
    await page.getByRole('button', { name: 'Disable analytics' }).click()
    await page.waitForURL(`${BASE}/en/cookies`) // компонент перезагружает страницу
    await expect(page.getByText('analytics disabled')).toBeVisible()
    expect(await consentCookie(page)).toBe('denied.v1')
    // После отзыва скрипт больше не запрашивается.
    await page.goto(`${BASE}/en`)
    expect(hits.length).toBe(loadedBefore)
  })

  test('повторное включение со страницы настроек — без баннера и без перезагрузки', async ({
    page,
  }) => {
    const hits = await instrument(page)
    await page.goto(`${BASE}/en/cookies`)
    await expect(page.getByText('not set')).toBeVisible()

    await page.getByRole('button', { name: 'Enable analytics' }).click()
    await expect(page.getByText('analytics enabled')).toBeVisible()
    await expect.poll(() => hits.length).toBeGreaterThan(0)
    expect(await consentCookie(page)).toBe('granted.v1')
  })
})
