import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { defaultLocale, targetLocales } from '@/i18n/config'
import {
  findAllQuizzes,
  findQuizBySlug,
  quizLocales,
  quizPool,
} from '@/app/(frontend)/_components/content/getQuizzes'

/**
 * **M1-T10** (int-слой): читатель квизов на живом Payload.
 *
 * До этой задачи коллекция `quizzes` была осиротевшей — читателя не существовало вовсе, поэтому и
 * тестировать было нечего. Здесь закреплены три правила, каждое из которых уже один раз стоило
 * проекту бага в другом разделе:
 *  - черновик в публичную выдачу не попадает (инвариант №1);
 *  - непереведённый документ не отдаётся под чужой локалью (CR-01);
 *  - пул «квиза дня» берётся ЦЕЛИКОМ, а не страницей (ошибка класса CR-07).
 */

const RUN = `m1t10-${Date.now()}`
const target = targetLocales[0]

let payload: Payload

const QUESTIONS = [
  {
    question: 'Q',
    options: [
      { text: 'a', isCorrect: false },
      { text: 'b', isCorrect: true },
    ],
  },
]

const mk = async (slug: string, status: 'draft' | 'published') =>
  payload.create({
    collection: 'quizzes',
    locale: defaultLocale,
    data: { title: `${RUN} ${slug}`, slug: `${RUN}-${slug}`, questions: QUESTIONS, _status: status },
  })

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  await payload.delete({ collection: 'quizzes', where: { slug: { like: `${RUN}-` } } })
}, 180_000)

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'quizzes', where: { slug: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 180_000)

const ours = <T extends { slug?: string | null }>(docs: T[]) =>
  docs.filter((d) => d.slug?.startsWith(RUN))

describe('findAllQuizzes', () => {
  it('отдаёт опубликованное и НЕ отдаёт черновик', async () => {
    // Публикация — человеческое действие (инвариант №1). Фильтр обязан стоять в `where`:
    // local API Payload по умолчанию идёт с overrideAccess, то есть access control коллекции
    // в публичном чтении не участвует.
    await mk('pub', 'published')
    await mk('draft', 'draft')

    const { docs } = await findAllQuizzes(defaultLocale)
    const slugs = ours(docs).map((d) => d.slug)
    expect(slugs).toContain(`${RUN}-pub`)
    expect(slugs).not.toContain(`${RUN}-draft`)
  })

  it('непереведённый квиз не приходит в чужой локали (CR-01)', async () => {
    const { docs } = await findAllQuizzes(target)
    expect(ours(docs)).toEqual([])
  })
})

describe('findQuizBySlug', () => {
  it('черновик по прямой ссылке — null (вне предпросмотра)', async () => {
    expect(await findQuizBySlug(defaultLocale, `${RUN}-draft`)).toBeNull()
  })

  it('опубликованный — приходит', async () => {
    const quiz = await findQuizBySlug(defaultLocale, `${RUN}-pub`)
    expect(quiz?.slug).toBe(`${RUN}-pub`)
    expect(quiz?.questions?.length).toBe(1)
  })

  it('в чужой локали непереведённый — null, а не исходный текст', async () => {
    expect(await findQuizBySlug(target, `${RUN}-pub`)).toBeNull()
  })
})

describe('quizPool (пул «квиза дня»)', () => {
  // 14 квизов с вложенными массивами — это 14 записей по несколько таблиц каждая, дефолтных
  // 5 с не хватает.
  it(
    'НЕ страница, а весь пул: больше PER_PAGE квизов приходят целиком',
    async () => {
      // pickOfDay берёт день % длину пула: обрезанный до 12 пул превратил бы «квиз дня»
      // в «квиз первой страницы».
      for (let i = 0; i < 14; i++) await mk(`bulk-${i}`, 'published')
      const pool = ours(await quizPool(defaultLocale))
      expect(pool.length).toBeGreaterThan(12)
    },
    60_000,
  )

  it('черновики в пул не попадают', async () => {
    const pool = ours(await quizPool(defaultLocale))
    expect(pool.map((q) => q.slug)).not.toContain(`${RUN}-draft`)
  })
})

describe('quizLocales (hreflang)', () => {
  it('перечисляет только локали, где квиз реально есть', async () => {
    // hreflang, объявленный для локали без перевода, — это приглашение краулера на 404.
    expect(await quizLocales(`${RUN}-pub`)).toEqual([defaultLocale])
  })

  it('после перевода появляется вторая локаль', async () => {
    const quiz = await findQuizBySlug(defaultLocale, `${RUN}-pub`)
    await payload.update({
      collection: 'quizzes',
      id: quiz!.id,
      locale: target,
      // ⚠️ id строк массива передаём явно: локализованные поля лежат внутри НЕлокализованного
      // массива, и без id Payload пересоздал бы строки, потеряв исходный текст.
      data: {
        title: `${RUN} переведён`,
        questions: (quiz!.questions ?? []).map((row) => ({
          id: row.id,
          question: 'Вопрос',
          options: (row.options ?? []).map((o) => ({
            id: o.id,
            text: 'вариант',
            isCorrect: o.isCorrect,
          })),
        })),
      },
    })

    expect((await quizLocales(`${RUN}-pub`)).sort()).toEqual([defaultLocale, target].sort())

    // И исходная локаль не пострадала — это и есть проверка ловушки с id строк.
    const source = await findQuizBySlug(defaultLocale, `${RUN}-pub`)
    expect(source?.questions?.[0]?.question).toBe('Q')
    expect(source?.questions?.[0]?.options?.[1]?.isCorrect).toBe(true)
  })
})
