import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  let page: Page

  // Хук ждёт первую компиляцию /admin на холодном dev-сервере (60–90+ с) — дефолтных 30 с мало.
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000)
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  // ⚠️ URL сверяем по ПУТИ, а не строкой целиком. Админка Payload после гидратации дописывает
  // в адрес дефолты представления (`?depth=1&limit=10` на списке), поэтому точное сравнение —
  // гонка: `toHaveURL` проходит, только если первый опрос успел до гидратации. Именно так этот
  // тест «мигал» между прогонами без единой правки кода (падение в CI PR #83 при зелёном #80).
  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL(/\/admin(\?|$)/)
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users')
    await expect(page).toHaveURL(/\/admin\/collections\/users(\?|$)/)
    const listViewArtifact = page.locator('h1', { hasText: 'Users' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users/create')
    await expect(page).toHaveURL(/\/admin\/collections\/users\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="email"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
