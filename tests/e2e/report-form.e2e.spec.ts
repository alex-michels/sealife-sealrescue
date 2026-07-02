import { test, expect } from '@playwright/test'

/**
 * QA-25 (e2e): форма «сообщить» (/report, sealrescue) — контракты, существующие УЖЕ:
 *  - email НЕ собирается нигде на форме (инвариант №4 / COMPLIANCE) + явная плашка об этом;
 *  - за гарантированным ответом — ссылка на контакт оператора (Impressum/legal-notice),
 *    это contact point оператора, не сбор данных;
 *  - error-состояние: без обязательного сообщения форма не уходит;
 *  - success-состояние после отправки (role=status).
 *
 * NB: форма пока ДЕМО (ничего не шлёт — см. ReportForm.tsx). Ассерт «сабмит создаёт
 * submission со статусом pending» на уровне e2e появится с реальной проводкой M2-T04;
 * серверный контракт премодерации уже закреплён в tests/int/user-submissions.int.spec.ts.
 * Rate-limit-ассерт — после SEC-05.
 */

const BASE = 'http://localhost:3000'
const REPORT = `${BASE}/en/report?site=sealrescue`

test.describe('Report form', () => {
  test('email не собирается: ни одного email-поля, есть явная плашка и контакт оператора', async ({
    page,
  }) => {
    await page.goto(REPORT)
    const form = page.locator('form')
    await expect(form).toBeVisible()

    // Инвариант №4: никаких email-инпутов (type/name/autocomplete).
    await expect(page.locator('input[type="email"]')).toHaveCount(0)
    await expect(page.locator('[name*="email" i], [autocomplete*="email" i]')).toHaveCount(0)

    // Явная плашка «мы не собираем email» + ник строго необязательный.
    await expect(
      page.getByText('We collect no email — anywhere, not even to reply', { exact: false }),
    ).toBeVisible()
    await expect(page.getByLabel(/TG\/VK handle \(optional\)|Ник в TG\/VK/)).toBeVisible()

    // Ответ гарантируется через контакт оператора в legal notice (не через сбор данных).
    await expect(page.getByRole('link', { name: 'in the legal notice' })).toHaveAttribute(
      'href',
      '/en/legal-notice',
    )
  })

  test('error-состояние: пустое обязательное сообщение блокирует отправку', async ({ page }) => {
    await page.goto(REPORT)
    await page.getByRole('button', { name: 'Send for moderation' }).click()
    // Браузерная валидация required: форма не отправлена, success-статуса нет.
    await expect(page.getByRole('status')).toHaveCount(0)
    const invalid = await page
      .locator('textarea[name="message"]')
      .evaluate((el) => (el as HTMLTextAreaElement).validity.valueMissing)
    expect(invalid).toBe(true)
  })

  test('success-состояние после отправки заполненной формы', async ({ page }) => {
    await page.goto(REPORT)
    await page.locator('textarea[name="message"]').fill('QA-25: тестовое сообщение о центре')
    await page.getByRole('button', { name: 'Send for moderation' }).click()
    await expect(page.getByRole('status')).toContainText('pre-moderation')
  })
})
