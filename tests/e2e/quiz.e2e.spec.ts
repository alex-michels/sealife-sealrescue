import { test, expect } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import config from '../../src/payload.config.js'

/**
 * **M1-T10** — прохождение квиза от списка до результата.
 *
 * Квиз — обычная HTML-форма с `method="get"`: нативные radio, ответы в query, подсчёт на сервере.
 * Поэтому здесь проверяется именно то, чего не видно ни unit-, ни int-тестом: что форма реально
 * отправляется, что результат считается по отправленным ответам, что подкрученный вручную адрес не
 * даёт очков и что после прохождения в браузере не осталось НИЧЕГО (ни ключа localStorage).
 *
 * Фикстуры создаются напрямую через Payload (как в `seo.e2e.spec.ts`) и публикуются: сиды пишут
 * черновиками (BIO-16), а для прохождения нужен опубликованный квиз.
 */

const BASE = 'http://localhost:3000'
const RUN = `m1t10-${Date.now()}`
const BOOT_TIMEOUT = 120_000

const TRANSLATED = `${RUN}-translated`
const SOURCE_ONLY = `${RUN}-source-only`

let payload: Payload

/** Верный вариант — индекс 1 в обоих вопросах. */
const EN_QUESTIONS = [
  {
    question: 'How many flippers does a seal have?',
    options: [
      { text: 'Two', isCorrect: false },
      { text: 'Four', isCorrect: true },
      { text: 'Six', isCorrect: false },
    ],
    explanation: 'Seals have two front and two hind flippers.',
  },
  {
    question: 'Is a lone seal pup on the beach usually in trouble?',
    options: [
      { text: 'Yes, always', isCorrect: false },
      { text: 'No, usually it is normal', isCorrect: true },
    ],
    explanation: 'A pup resting alone is normal; the mother is often nearby.',
  },
]

const RU_QUESTIONS = [
  {
    question: 'Сколько ласт у тюленя?',
    options: ['Две', 'Четыре', 'Шесть'],
    explanation: 'У тюленя две передние и две задние ласты.',
  },
  {
    question: 'Одинокий детёныш на берегу — это всегда беда?',
    options: ['Да, всегда', 'Нет, обычно это норма'],
    explanation: 'Отдыхающий в одиночку детёныш — норма, мать часто рядом.',
  },
]

test.beforeAll(async () => {
  test.setTimeout(BOOT_TIMEOUT)
  payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'quizzes', where: { slug: { like: `${RUN}-` } } })

  // Исходная локаль (en) — там же разметка верных вариантов: `isCorrect` НЕ локализован.
  const created = await payload.create({
    collection: 'quizzes',
    locale: 'en',
    data: {
      title: `${RUN} Seal basics`,
      slug: TRANSLATED,
      description: 'Two questions about seals.',
      questions: EN_QUESTIONS,
      _status: 'published',
    },
  })

  /*
   * Перевод на ru. ⚠️ Ключевой момент: локализованные поля (`question`, `options[].text`) лежат
   * ВНУТРИ нелокализованных массивов. Без `id` строк Payload пересоздаёт строки массива — и
   * английский текст (а с ним и разметка `isCorrect`) теряется. Поэтому id строк передаются явно.
   */
  await payload.update({
    collection: 'quizzes',
    id: created.id,
    locale: 'ru',
    data: {
      title: `${RUN} Основы про тюленей`,
      description: 'Два вопроса о тюленях.',
      questions: (created.questions ?? []).map((row, i) => ({
        id: row.id,
        question: RU_QUESTIONS[i].question,
        explanation: RU_QUESTIONS[i].explanation,
        options: (row.options ?? []).map((opt, j) => ({
          id: opt.id,
          text: RU_QUESTIONS[i].options[j],
          isCorrect: opt.isCorrect,
        })),
      })),
    },
  })

  // Второй квиз — только на исходной локали, для проверки гейта CR-01.
  await payload.create({
    collection: 'quizzes',
    locale: 'en',
    data: {
      title: `${RUN} Source only`,
      slug: SOURCE_ONLY,
      questions: EN_QUESTIONS,
      _status: 'published',
    },
  })
})

test.afterAll(async () => {
  test.setTimeout(BOOT_TIMEOUT)
  if (!payload) return
  await payload.delete({ collection: 'quizzes', where: { slug: { like: `${RUN}-` } } })
})

test.describe('Квиз: список', () => {
  test('квиз виден в разделе, с числом вопросов', async ({ page }) => {
    await page.goto(`${BASE}/en/quizzes`)
    const card = page.getByRole('link', { name: new RegExp(`${RUN} Seal basics`) })
    await expect(card).toBeVisible()
    await expect(page.locator('body')).toContainText('Questions: 2')
  })

  test('перевод есть — квиз виден и в ru', async ({ page }) => {
    // Проверяет заодно, что перевод строк массива не потерял русский текст.
    await page.goto(`${BASE}/ru/quizzes`)
    await expect(page.getByRole('link', { name: new RegExp(`${RUN} Основы`) })).toBeVisible()
  })

  test('CR-01: непереведённый квиз в чужой локали не показывается и отдаёт 404', async ({
    page,
    request,
  }) => {
    await page.goto(`${BASE}/ru/quizzes`)
    await expect(page.locator('body')).not.toContainText(`${RUN} Source only`)

    const res = await request.get(`${BASE}/ru/quizzes/${SOURCE_ONLY}`)
    expect(res.status()).toBe(404)
  })

  test('несуществующий slug — настоящий HTTP 404 (без loading-границы)', async ({ request }) => {
    const res = await request.get(`${BASE}/en/quizzes/${RUN}-nope`)
    expect(res.status()).toBe(404)
  })
})

test.describe('Квиз: прохождение', () => {
  test('форма показывает вопросы и НЕ показывает результат до отправки', async ({ page }) => {
    await page.goto(`${BASE}/en/quizzes/${TRANSLATED}`)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${RUN} Seal basics`)
    // Группы radio — нативные, по одной на вопрос (клавиатура и скринридер бесплатно).
    await expect(page.locator('fieldset')).toHaveCount(2)
    await expect(page.locator('input[type=radio][name="q0"]')).toHaveCount(3)
    await expect(page.locator('input[type=radio][name="q1"]')).toHaveCount(2)
    // Прямой заход не должен выглядеть как «0 из 2»: результата ещё нет.
    await expect(page.locator('body')).not.toContainText('Result')
  })

  test('все ответы верные — 2 / 2 и объяснения', async ({ page }) => {
    await page.goto(`${BASE}/en/quizzes/${TRANSLATED}`)
    await page.locator('input[name="q0"][value="1"]').check()
    await page.locator('input[name="q1"][value="1"]').check()
    await page.getByRole('button', { name: 'Check answers' }).click()

    await expect(page.locator('body')).toContainText('2 / 2')
    await expect(page.locator('body')).toContainText('Seals have two front and two hind flippers.')
    // Состояние живёт в URL — им можно поделиться и вернуться назад.
    expect(page.url()).toContain('done=1')
    expect(page.url()).toContain('q0=1')
  })

  test('неверный ответ — 1 / 2, верный вариант помечен текстом, а не только цветом', async ({
    page,
  }) => {
    await page.goto(`${BASE}/en/quizzes/${TRANSLATED}?done=1&q0=0&q1=1`)

    await expect(page.locator('body')).toContainText('1 / 2')
    // Цвет не единственный носитель смысла (WCAG 2.2 AA): у верного варианта есть подпись.
    await expect(page.locator('body')).toContainText('Correct')
    await expect(page.locator('body')).toContainText('Your answer')
  })

  test('подкрученный адрес не даёт очков и не роняет страницу', async ({ page, request }) => {
    const url = `${BASE}/en/quizzes/${TRANSLATED}?done=1&q0=99&q1=-1`
    const res = await request.get(url)
    expect(res.status()).toBe(200)

    await page.goto(url)
    await expect(page.locator('body')).toContainText('0 / 2')
    await expect(page.locator('body')).toContainText('You left this question unanswered.')
  })

  test('«пройти заново» возвращает к вопросам', async ({ page }) => {
    await page.goto(`${BASE}/en/quizzes/${TRANSLATED}?done=1&q0=1&q1=1`)
    await page.getByRole('link', { name: 'Try again' }).click()
    await expect(page.locator('fieldset')).toHaveCount(2)
    expect(page.url()).not.toContain('done=1')
  })

  test('после прохождения в браузере не осталось ничего: ни одного ключа localStorage', async ({
    page,
  }) => {
    // Инвариант №4 прямо называет «очки квизов» тем, что нельзя держать в localStorage.
    await page.goto(`${BASE}/en/quizzes/${TRANSLATED}`)
    await page.locator('input[name="q0"][value="1"]').check()
    await page.getByRole('button', { name: 'Check answers' }).click()
    await expect(page.locator('body')).toContainText('1 / 2')

    const keys = await page.evaluate(() => Object.keys(window.localStorage))
    expect(keys).toEqual([])
  })

  test('русская локаль: вопросы и подписи переведены', async ({ page }) => {
    await page.goto(`${BASE}/ru/quizzes/${TRANSLATED}`)
    await expect(page.locator('body')).toContainText('Сколько ласт у тюленя?')
    await page.locator('input[name="q0"][value="1"]').check()
    await page.getByRole('button', { name: 'Проверить' }).click()
    await expect(page.locator('body')).toContainText('Верно')
    await expect(page.locator('body')).toContainText('У тюленя две передние и две задние ласты.')
  })
})
