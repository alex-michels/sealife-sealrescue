import { test, expect } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'
import { defaultLocale } from '../../src/i18n/config.js'

/**
 * **CR-08** — предпросмотр черновика.
 *
 * Главное здесь не «кнопка работает», а **гейт**: draft-режим это cookie, и включить его может
 * только сотрудник. Открытый эндпоинт означал бы публичный доступ ко всем черновикам сразу —
 * то есть ровно то, что запрещает инвариант №1 (публикует человек, а не любой, кто угадал URL).
 */

const BASE = 'http://localhost:3000'
const RUN = `cr08-${Date.now()}`
const SLUG = `${RUN}-draft`

let payload: Payload

test.beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await seedTestUser()
  await payload.create({
    collection: 'content',
    locale: defaultLocale,
    data: { type: 'article', slug: SLUG, title: `${RUN} черновик`, _status: 'draft' },
  })
})

test.afterAll(async () => {
  await payload.delete({ collection: 'content', where: { slug: { like: RUN } } }).catch(() => {})
  await cleanupTestUser()
  await payload.db.destroy?.()
})

test.describe('CR-08: предпросмотр черновика', () => {
  test('аноним НЕ включает draft-режим и не видит черновик', async ({ page }) => {
    const res = await page.goto(`${BASE}/api/preview?path=/${defaultLocale}/${SLUG}`)
    expect(res?.status(), 'без сессии сотрудника — 401').toBe(401)

    // И сама страница по-прежнему 404: черновика для читателя не существует.
    const doc = await page.goto(`${BASE}/${defaultLocale}/${SLUG}`)
    expect(doc?.status()).toBe(404)
  })

  test('открытый редирект невозможен: внешний путь отвергается до всякой авторизации', async ({
    page,
  }) => {
    // String.raw — иначе `'/\evil'` схлопывается в `/evil` (в JS `\e` не escape), и тест
    // проверял бы обычный относительный путь. Именно на это я и наступил при первом прогоне.
    for (const bad of [
      'https://evil.example',
      '//evil.example',
      String.raw`/\evil.example`,
      String.raw`\\evil.example`,
    ]) {
      const res = await page.goto(`${BASE}/api/preview?path=${encodeURIComponent(bad)}`)
      expect(res?.status(), `path=${bad}`).toBe(400)
    }
  })

  test('валидный относительный путь без сессии — 401, а не 400: гейт именно авторизационный', async ({
    page,
  }) => {
    // Разделяем две причины отказа. Если бы всё подряд отвергалось как «плохой путь», дыра в
    // авторизации осталась бы незамеченной.
    const res = await page.goto(`${BASE}/api/preview?path=%2Fen%2Fabout`)
    expect(res?.status()).toBe(401)
  })

  test('сотрудник видит черновик, плашка предпросмотра на месте, выход возвращает 404', async ({
    page,
  }) => {
    await login({ page, user: testUser })

    await page.goto(`${BASE}/api/preview?path=/${defaultLocale}/${SLUG}`)
    await expect(page).toHaveURL(`${BASE}/${defaultLocale}/${SLUG}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${RUN} черновик`)

    // Плашка обязательна: draft-режим внешне неотличим от обычного сайта.
    const banner = page.getByRole('status').filter({ hasText: /Draft preview|Предпросмотр/ })
    await expect(banner).toBeVisible()

    // Выход снимает режим — и черновик снова не существует.
    await page.goto(`${BASE}/api/preview/exit?path=/${defaultLocale}/${SLUG}`)
    const after = await page.goto(`${BASE}/${defaultLocale}/${SLUG}`)
    expect(after?.status(), 'после выхода черновик снова 404').toBe(404)
  })
})
