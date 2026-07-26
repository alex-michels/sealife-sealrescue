import crypto from 'crypto'
import { describe, it, expect } from 'vitest'
import { forceAgentDrafts, markTranslationsStale } from '@/hooks/contentHooks'
import { defaultLocale, targetLocales } from '@/i18n/config'

/**
 * QA-14 (unit-слой): хуки контента как чистые функции. Поведение на живом Payload
 * (create/update, partial-update) — tests/int/content-hooks.int.spec.ts.
 */

type HookArgs = Parameters<typeof forceAgentDrafts>[0]
const args = (a: {
  data?: Record<string, unknown>
  role?: string
  locale?: string
  originalDoc?: Record<string, unknown>
}): HookArgs =>
  ({
    data: a.data ?? {},
    req: { user: a.role ? { role: a.role } : null, locale: a.locale },
    originalDoc: a.originalDoc,
  }) as unknown as HookArgs

const hashOf = (title: string, body: unknown = '') =>
  crypto
    .createHash('sha256')
    .update(`${title}\n${JSON.stringify(body)}`)
    .digest('hex')

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

/**
 * Направление перевода берётся из `@/i18n/config`, а не пришпилено литералами: после CR-14
 * исходная локаль — en, целевая — ru, и следующий разворот не должен переписывать этот файл.
 * Литералы живут ровно в одном месте — `tests/unit/i18n.unit.spec.ts`.
 */
describe('markTranslationsStale', () => {
  const target = targetLocales[0]

  it('целевая локаль: data возвращается без localeStatus', () => {
    const data = { title: 'Перевод' }
    expect(markTranslationsStale(args({ data, locale: target }))).toEqual(data)
  })

  it('первая запись исходной локали: каждая целевая помечается stale', () => {
    const out = markTranslationsStale(args({ data: { title: 'Seal' }, locale: defaultLocale })) as {
      localeStatus: Array<{ locale: string; status: string; sourceHash: string | null }>
    }
    expect(out.localeStatus.map((s) => s.locale).sort()).toEqual([...targetLocales].sort())
    for (const s of out.localeStatus) {
      expect(s.status).toBe('stale')
      expect(s.sourceHash).toBeNull()
    }
  })

  it('no-op запись при актуальном переводе: статус current сохраняется', () => {
    const hash = hashOf('Seal')
    const prev = targetLocales.map((locale) => ({
      locale,
      status: 'current',
      sourceHash: hash,
      translatedAt: '2026-07-01',
    }))
    const out = markTranslationsStale(
      args({ data: { title: 'Seal', localeStatus: prev }, locale: defaultLocale }),
    ) as { localeStatus: Array<{ status: string; translatedAt: string | null }> }
    for (const s of out.localeStatus) {
      expect(s.status).toBe('current')
      expect(s.translatedAt).toBe('2026-07-01')
    }
  })

  it('смена исходного текста: переводы флипаются в stale, translatedAt/sourceHash сохраняются', () => {
    const oldHash = hashOf('Seal')
    const prev = targetLocales.map((locale) => ({
      locale,
      status: 'current',
      sourceHash: oldHash,
      translatedAt: '2026-07-01',
    }))
    const out = markTranslationsStale(
      args({ data: { title: 'Walrus', localeStatus: prev }, locale: defaultLocale }),
    ) as { localeStatus: Array<{ status: string; sourceHash: string; translatedAt: string }> }
    for (const s of out.localeStatus) {
      expect(s.status).toBe('stale')
      expect(s.sourceHash).toBe(oldHash) // агент-переводчик перезапишет после перевода
      expect(s.translatedAt).toBe('2026-07-01')
    }
  })

  it('partial-update без localeStatus: прежнее состояние берётся из originalDoc, не теряется', () => {
    const hash = hashOf('Seal')
    const originalDoc = {
      title: 'Seal',
      localeStatus: targetLocales.map((locale) => ({
        locale,
        status: 'current',
        sourceHash: hash,
        translatedAt: '2026-07-01',
      })),
    }
    // data без title/body (например, обновили только topics) — hash должен считаться
    // от originalDoc, а не от пустых строк (иначе ложный stale).
    const out = markTranslationsStale(
      args({ data: { topics: ['seals'] }, locale: defaultLocale, originalDoc }),
    ) as { localeStatus: Array<{ status: string; translatedAt: string | null }> }
    for (const s of out.localeStatus) {
      expect(s.status).toBe('current')
      expect(s.translatedAt).toBe('2026-07-01')
    }
  })

  it('req.locale не задан (агентные partial-записи) — считается исходной локалью', () => {
    const out = markTranslationsStale(args({ data: { title: 'Seal' } })) as {
      localeStatus: unknown[]
    }
    expect(out.localeStatus).toHaveLength(targetLocales.length)
  })
})
