import { test, expect, type Page } from '@playwright/test'

/**
 * BIO-01..BIO-06 — safety contract of the public «found a seal» guidance.
 *
 * Эти проверки не про вёрстку. Они запирают формулировки, отсутствие которых предметный аудит
 * 2026-07-26 счёл опасным: без «одинокий детёныш обычно НЕ брошен» страница подталкивает
 * забирать здоровых животных, а без «никогда не сталкивайте в воду» — совершать самую частую
 * смертельную ошибку очевидцев. Если кто-то сократит копирайт, тест обязан покраснеть.
 *
 * Тон намеренно проверяется через ПОРЯДОК: «обычно норма» должно стоять выше запретов, иначе
 * читатель, ушедший после первого экрана, унесёт неверный вывод.
 */

const BASE = 'http://localhost:3000'
const url = (locale: string) => `${BASE}/${locale}/what-to-do?site=sealrescue`

/** Вертикальная позиция первого совпадения текста — для проверки порядка блоков. */
async function topOf(page: Page, text: RegExp) {
  const box = await page.getByText(text).first().boundingBox()
  expect(box, `не найден блок: ${text}`).not.toBeNull()
  return box!.y
}

test.describe('«Нашёл тюленя» — контракт безопасности (RU)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(url('ru'))
  })

  test('главное сообщение: тюлень на берегу обычно в порядке, детёныш НЕ брошен', async ({
    page,
  }) => {
    const lead = page.getByText(/одинокий детёныш обычно НЕ брошен/i)
    await expect(lead).toBeVisible()
    await expect(page.getByText(/мать кормится в море и возвращается/i)).toBeVisible()
  })

  test('есть запрет возвращать тюленя в воду — самая частая смертельная ошибка', async ({
    page,
  }) => {
    await expect(page.getByText(/не сталкивайте и не относите тюленя в воду/i)).toBeVisible()
    await expect(page.getByText(/не поливайте водой и не накрывайте/i)).toBeVisible()
    await expect(page.getByText(/не кормите и не поите/i)).toBeVisible()
    await expect(page.getByText(/не перевозите сами/i)).toBeVisible()
  })

  test('есть предупреждение про укусы и зоонозы — защита читателя, а не только животного', async ({
    page,
  }) => {
    const bite = page.getByText(/кусается/i)
    await expect(bite).toBeVisible()
    await expect(page.getByText(/палец тюленя|микоплазмоз/i)).toBeVisible()
  })

  test('вместо пустого «оцените состояние» — наблюдаемые признаки', async ({ page }) => {
    await expect(page.getByText(/видимая рана или кровь/i)).toBeVisible()
    await expect(page.getByText(/запутался в сети, леске или пластике/i)).toBeVisible()
    await expect(page.getByText(/тяжёлое, шумное дыхание/i)).toBeVisible()
    await expect(page.getByText(/не отпала пуповина/i)).toBeVisible()
  })

  test('у дистанции есть числовой порог, а не только «зависит от страны»', async ({ page }) => {
    await expect(page.getByText(/не ближе 100 метров/i).first()).toBeVisible()
  })

  test('порядок: «обычно норма» стоит ВЫШЕ блока запретов и признаков', async ({ page }) => {
    const normal = await topOf(page, /одинокий детёныш обычно НЕ брошен/i)
    const never = await topOf(page, /Чего НЕ делать никогда/i)
    const signs = await topOf(page, /Когда всё-таки звонить/i)
    expect(normal).toBeLessThan(never)
    expect(never).toBeLessThan(signs)
  })

  test('настоящие инструкции НЕ помечены плашкой демо-данных', async ({ page }) => {
    // Подписывать реальные указания по безопасности выдумкой опаснее, чем не показывать их.
    await expect(page.getByText(/демо|demo|образц/i)).toHaveCount(0)
  })
})

test.describe('«Нашёл тюленя» — контракт безопасности (EN)', () => {
  test('английская версия несёт те же три обязательных сообщения', async ({ page }) => {
    await page.goto(url('en'))
    await expect(page.getByText(/pup on its own is usually NOT abandoned/i)).toBeVisible()
    await expect(page.getByText(/Never push or carry a seal into the water/i)).toBeVisible()
    await expect(page.getByText(/seals bite/i)).toBeVisible()
    await expect(page.getByText(/at least 100 metres/i).first()).toBeVisible()
  })
})

test.describe('rescue-квест учит правильному (BIO-01/BIO-05)', () => {
  /** Ответить и перейти к следующему сценарию (после выбора появляется «Дальше →»). */
  async function answer(page: Page, option: RegExp) {
    await page.getByRole('button', { name: option }).click()
    await page.getByRole('button', { name: /Дальше →|Итог →/ }).click()
  }

  test('«забрать одинокого детёныша» — неверный ответ, «оставить» — верный', async ({ page }) => {
    await page.goto(`${BASE}/ru/rescue-quest?site=sealrescue`)

    await answer(page, /Держать дистанцию, убрать собак/i)

    await page.getByRole('button', { name: /Забрать — он брошен/i }).click()
    await expect(page.getByText(/это самая частая ошибка/i)).toBeVisible()
    await expect(page.getByText(/мать кормится в море/i)).toBeVisible()
  })

  test('при клинических признаках наблюдения НЕДОСТАТОЧНО — надо звонить', async ({ page }) => {
    await page.goto(`${BASE}/ru/rescue-quest?site=sealrescue`)

    // Доходим до клинического сценария верными ответами: дистанция → детёныш → спящий тюлень.
    await answer(page, /Держать дистанцию, убрать собак/i)
    await answer(page, /Оставить и наблюдать издалека/i)
    await answer(page, /Не мешать/i)

    // Сценарий с раной и тяжёлым дыханием: «наблюдать» здесь — НЕВЕРНО.
    await page.getByRole('button', { name: /Наблюдать издалека и подождать/i }).click()
    await expect(page.getByText(/Здесь наблюдения мало/i)).toBeVisible()
    await expect(page.getByText(/признаки беды, а не отдыха/i)).toBeVisible()
  })
})
