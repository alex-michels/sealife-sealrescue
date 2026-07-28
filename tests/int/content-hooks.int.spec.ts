import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { defaultLocale, targetLocales } from '@/i18n/config'
import { translatedWhere } from '@/i18n/translated'

/**
 * QA-14 (int-слой): `trackTranslationStatus` на живом Payload.
 * (forceAgentDrafts на живом Payload закреплён в access-matrix.int.spec.ts, QA-13.)
 *
 * ## Почему этот файл переписан (CR-15)
 * Прежняя версия закрепляла как ожидаемое ровно то, что оказалось багом: «создание помечает
 * переводы stale» и «запись целевой локали не трогает localeStatus». Отсюда и жило противоречие —
 * тесты были зелёными, а поле в проде про каждый документ утверждало `stale`, потому что
 * посчитанный `sourceHash` не сохранял никто. До `current` тот тест доходил только потому, что
 * подавал хэш сам, руками — то есть проверял не хук, а собственную подстановку.
 *
 * Здесь вместо этого прогоняется настоящий жизненный цикл: написали исходник → перевели →
 * поправили исходник → перевели заново.
 *
 * Направление перевода берётся из `@/i18n/config`, а не пришпилено литералами: после **CR-14**
 * исходная локаль — en, целевая — ru. Литералы направления живут ровно в одном файле,
 * `tests/unit/i18n.unit.spec.ts`.
 */

const RUN = `qa14-${Date.now()}`
const target = targetLocales[0]

type LocaleStatus = Array<{
  locale: string
  status?: string | null
  sourceHash?: string | null
  translatedAt?: string | null
}>

const lex = (text: string) => ({
  root: {
    type: 'root',
    children: [
      { type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] },
    ],
    direction: null,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

let payload: Payload
let docId: number | string

const SOURCE_TITLE = `${RUN} Seal`

/** Строка статуса целевой локали + сводка документа, прочитанные из исходной локали. */
const readStatus = async () => {
  const doc = await payload.findByID({ collection: 'content', id: docId, locale: defaultLocale })
  const rows = (doc.localeStatus ?? []) as LocaleStatus
  return { row: rows.find((r) => r.locale === target)!, rows, summary: doc.translationStatus }
}

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const doc = await payload.create({
    collection: 'content',
    data: {
      type: 'article',
      title: SOURCE_TITLE,
      slug: `${RUN}-doc`,
      body: lex('English body'),
      _status: 'published',
    },
    locale: defaultLocale,
  })
  docId = doc.id
}, 120_000)

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'content', where: { slug: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 120_000)

describe('trackTranslationStatus (live Payload)', () => {
  it('создание в исходной локали: перевода нет — missing, а не «устарел»', async () => {
    const { rows, summary } = await readStatus()
    expect(rows.map((s) => s.locale).sort()).toEqual([...targetLocales].sort())
    for (const s of rows) {
      expect(s.status, s.locale).toBe('missing')
      expect(s.sourceHash, s.locale).toBeNull()
    }
    expect(summary).toBe('missing')
  })

  it('переведён только заголовок: review — половина перевода не «актуальна»', async () => {
    await payload.update({
      collection: 'content',
      id: docId,
      locale: target,
      data: { title: `${RUN} Тюлень` },
    })
    const { row, summary } = await readStatus()
    expect(row.status).toBe('review')
    expect(row.sourceHash).toBeNull()
    expect(summary).toBe('review')
  })

  it('полный перевод фиксирует версию исходника — регрессия CR-15', async () => {
    // Тот самый писатель, которого не было: без него sourceHash оставался null навсегда.
    await payload.update({
      collection: 'content',
      id: docId,
      locale: target,
      data: { body: lex('Русский текст') },
    })
    const { row, summary } = await readStatus()
    expect(row.status).toBe('current')
    expect(row.sourceHash).toBeTruthy()
    expect(row.translatedAt).toBeTruthy()
    expect(summary).toBe('current')
  })

  it('no-op запись исходника перевод не роняет', async () => {
    await payload.update({
      collection: 'content',
      id: docId,
      locale: defaultLocale,
      data: { title: SOURCE_TITLE },
    })
    expect((await readStatus()).row.status).toBe('current')
  })

  it('partial-update без переводимых полей (только topics) не роняет перевод', async () => {
    await payload.update({
      collection: 'content',
      id: docId,
      locale: defaultLocale,
      data: { topics: ['biology'] } as never,
    })
    expect((await readStatus()).row.status).toBe('current')
  })

  it('правка исходника делает перевод stale, сохраняя его происхождение', async () => {
    const before = (await readStatus()).row
    await payload.update({
      collection: 'content',
      id: docId,
      locale: defaultLocale,
      data: { title: `${RUN} Walrus` },
    })
    const { row, summary } = await readStatus()
    expect(row.status).toBe('stale')
    // Хэш принадлежит переводу («от какой версии он сделан») и записью исходника не перетирается.
    expect(row.sourceHash).toBe(before.sourceHash)
    expect(row.translatedAt).toBe(before.translatedAt)
    expect(summary).toBe('stale')
  })

  it('перевели заново — снова current, с новым хэшем', async () => {
    const stale = (await readStatus()).row
    await payload.update({
      collection: 'content',
      id: docId,
      locale: target,
      data: { title: `${RUN} Морж` },
    })
    const { row } = await readStatus()
    expect(row.status).toBe('current')
    expect(row.sourceHash).not.toBe(stale.sourceHash)
  })

  it('устаревший перевод со страницы НЕ исчезает', async () => {
    // Граница между CR-15 и CR-01: прятать можно только по «перевода нет». Устаревший перевод
    // остаётся в выдаче — он всё ещё лучше пустой страницы.
    await payload.update({
      collection: 'content',
      id: docId,
      locale: defaultLocale,
      data: { title: `${RUN} Elephant seal` },
    })
    expect((await readStatus()).row.status).toBe('stale')

    const visible = await payload.find({
      collection: 'content',
      locale: target,
      fallbackLocale: false,
      where: { and: [{ slug: { equals: `${RUN}-doc` } }, translatedWhere('title')] },
      depth: 0,
    })
    expect(visible.docs.map((d) => d.id)).toEqual([docId])
  })

  it('статус читаемый: по нему можно спросить «что осталось перевести»', async () => {
    // Ради этого всё и затевалось — до CR-15 такой запрос возвращал вообще все документы.
    const untranslated = await payload.create({
      collection: 'content',
      data: { type: 'article', title: `${RUN} Untranslated`, slug: `${RUN}-todo` },
      locale: defaultLocale,
    })

    const todo = await payload.find({
      collection: 'content',
      where: { and: [{ translationStatus: { equals: 'missing' } }, { slug: { like: `${RUN}-` } }] },
      depth: 0,
      pagination: false,
    })
    expect(todo.docs.map((d) => d.id)).toEqual([untranslated.id])

    // Переведённый документ в этот список не попадает — то есть поле различает документы.
    // Сравниваем с `missing`, а не с `current`: к этому моменту перевод уже устарел, и точный
    // статус проверяют тесты выше — здесь важно ровно то, что документы различимы.
    const done = await payload.find({
      collection: 'content',
      where: {
        and: [{ translationStatus: { not_equals: 'missing' } }, { slug: { like: `${RUN}-` } }],
      },
      depth: 0,
      pagination: false,
    })
    expect(done.docs.map((d) => d.id)).toEqual([docId])
  })
})
