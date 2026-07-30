import { describe, it, expect } from 'vitest'
import { forceAgentDrafts, trackTranslationStatus } from '@/hooks/contentHooks'
import { defaultLocale, targetLocales } from '@/i18n/config'
import { sourceHashOf, type LocaleStatusRow } from '@/content/localeStatus'

/**
 * QA-14 (unit-слой): хуки контента. Поведение на живом Payload (create/update, partial-update,
 * запись перевода) — tests/int/content-hooks.int.spec.ts.
 *
 * Направление перевода берётся из `@/i18n/config`, а не пришпилено литералами: после CR-14
 * исходная локаль — en, целевая — ru, и следующий разворот не должен переписывать этот файл.
 * Литералы живут ровно в одном месте — `tests/unit/i18n.unit.spec.ts`.
 */

type HookArgs = Parameters<typeof forceAgentDrafts>[0]

const target = targetLocales[0]

/**
 * Хук дочитывает соседнюю локаль отдельным запросом — здесь её подменяет `docs`.
 * Локаль, которой в `docs` нет, ведёт себя как ненайденный документ.
 */
const args = (a: {
  data?: Record<string, unknown>
  role?: string
  locale?: string
  originalDoc?: Record<string, unknown>
  docs?: Record<string, Record<string, unknown>>
}): HookArgs =>
  ({
    data: a.data ?? {},
    collection: { slug: 'content' },
    req: {
      user: a.role ? { role: a.role } : null,
      locale: a.locale,
      payload: {
        findByID: async ({ locale }: { locale: string }) => {
          const doc = a.docs?.[locale]
          if (!doc) throw new Error('NotFound')
          return doc
        },
      },
    },
    originalDoc: a.originalDoc,
  }) as unknown as HookArgs

type Out = {
  localeStatus: LocaleStatusRow[]
  translationStatus: string
}
const run = async (a: Parameters<typeof args>[0]) =>
  (await trackTranslationStatus(args(a))) as unknown as Out

describe('forceAgentDrafts', () => {
  it('агент: любое сохранение принудительно draft — даже явный published', () => {
    const out = forceAgentDrafts(args({ data: { _status: 'published' }, role: 'agent' }))
    expect((out as { _status: string })._status).toBe('draft')
  })

  it('люди и аноним: данные не трогаются', () => {
    for (const role of ['admin', 'editor', 'translator', 'viewer', undefined]) {
      const data = { _status: 'published', title: 'x' }
      expect(forceAgentDrafts(args({ data, role }))).toEqual(data)
    }
  })
})

describe('trackTranslationStatus — запись исходной локали', () => {
  it('создание: перевода ещё нет, значит missing (а не «устарел»)', async () => {
    const out = await run({ data: { title: 'Seal' }, locale: defaultLocale })
    expect(out.localeStatus.map((s) => s.locale).sort()).toEqual([...targetLocales].sort())
    for (const s of out.localeStatus) {
      expect(s.status).toBe('missing')
      expect(s.sourceHash).toBeNull()
    }
    expect(out.translationStatus).toBe('missing')
  })

  it('перевод на месте и от текущей версии — current', async () => {
    const hash = sourceHashOf({ title: 'Seal' })
    const out = await run({
      data: { title: 'Seal' },
      locale: defaultLocale,
      originalDoc: {
        id: 1,
        title: 'Seal',
        localeStatus: targetLocales.map((locale) => ({
          locale,
          status: 'current',
          sourceHash: hash,
          translatedAt: '2026-07-01',
        })),
      },
      docs: Object.fromEntries(targetLocales.map((l) => [l, { title: 'Тюлень' }])),
    })
    for (const s of out.localeStatus) {
      expect(s.status).toBe('current')
      expect(s.translatedAt).toBe('2026-07-01')
    }
    expect(out.translationStatus).toBe('current')
  })

  it('исходник переписали — переводы становятся stale', async () => {
    const oldHash = sourceHashOf({ title: 'Seal' })
    const out = await run({
      data: { title: 'Walrus' },
      locale: defaultLocale,
      originalDoc: {
        id: 1,
        title: 'Seal',
        localeStatus: targetLocales.map((locale) => ({
          locale,
          status: 'current',
          sourceHash: oldHash,
          translatedAt: '2026-07-01',
        })),
      },
      docs: Object.fromEntries(targetLocales.map((l) => [l, { title: 'Тюлень' }])),
    })
    for (const s of out.localeStatus) {
      expect(s.status).toBe('stale')
      expect(s.sourceHash).toBe(oldHash)
    }
    expect(out.translationStatus).toBe('stale')
  })

  it('partial-update без переводимых полей не роняет перевод в stale', async () => {
    // Обновили только topics: хэш обязан считаться от originalDoc, а не от пустых строк.
    const hash = sourceHashOf({ title: 'Seal' })
    const out = await run({
      data: { topics: ['seals'] },
      locale: defaultLocale,
      originalDoc: {
        id: 1,
        title: 'Seal',
        localeStatus: targetLocales.map((locale) => ({
          locale,
          status: 'current',
          sourceHash: hash,
          translatedAt: '2026-07-01',
        })),
      },
      docs: Object.fromEntries(targetLocales.map((l) => [l, { title: 'Тюлень' }])),
    })
    for (const s of out.localeStatus) expect(s.status).toBe('current')
  })

  it('req.locale не задан (агентные записи) — считается исходной локалью', async () => {
    const out = await run({ data: { title: 'Seal' } })
    expect(out.localeStatus).toHaveLength(targetLocales.length)
  })
})

describe('trackTranslationStatus — запись перевода', () => {
  it('сохранение перевода фиксирует версию исходника', async () => {
    // Регрессия CR-15. Раньше эта ветка возвращала data нетронутой: sourceHash не записывал никто,
    // поэтому документ навсегда оставался stale, сколько его ни переводи.
    const out = await run({
      data: { title: 'Тюлень', body: { root: { children: [{ text: 'тело' }] } } },
      locale: target,
      originalDoc: { id: 1 },
      docs: {
        [defaultLocale]: { title: 'Seal', body: { root: { children: [{ text: 'body' }] } } },
      },
    })
    const row = out.localeStatus.find((s) => s.locale === target)!
    expect(row.status).toBe('current')
    expect(row.sourceHash).toBe(
      sourceHashOf({ title: 'Seal', body: { root: { children: [{ text: 'body' }] } } }),
    )
    expect(row.translatedAt).not.toBeNull()
    expect(out.translationStatus).toBe(targetLocales.length > 1 ? 'missing' : 'current')
  })

  it('переведён только заголовок — review, а не current', async () => {
    const out = await run({
      data: { title: 'Тюлень' },
      locale: target,
      originalDoc: { id: 1 },
      docs: {
        [defaultLocale]: { title: 'Seal', body: { root: { children: [{ text: 'body' }] } } },
      },
    })
    const row = out.localeStatus.find((s) => s.locale === target)!
    expect(row.status).toBe('review')
    expect(row.sourceHash).toBeNull()
  })

  it('создание сразу в целевой локали: фиксировать нечего, данные не трогаем', async () => {
    const data = { title: 'Тюлень' }
    expect(await trackTranslationStatus(args({ data, locale: target }))).toEqual(data)
  })

  it('исходник не читается — сохранение перевода всё равно проходит', async () => {
    // Статус перевода не тот повод, по которому редактор должен терять текст.
    const data = { title: 'Тюлень' }
    expect(
      await trackTranslationStatus(args({ data, locale: target, originalDoc: { id: 1 } })),
    ).toEqual(data)
  })
})
