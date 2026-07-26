import crypto from 'crypto'
import { describe, it, expect } from 'vitest'
import { forceAgentDrafts, markTranslationsStale } from '@/hooks/contentHooks'

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
  crypto.createHash('sha256').update(`${title}\n${JSON.stringify(body)}`).digest('hex')

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

describe('markTranslationsStale', () => {
  it('не-исходная локаль (en): data возвращается без localeStatus', () => {
    const data = { title: 'Hello' }
    expect(markTranslationsStale(args({ data, locale: 'en' }))).toEqual(data)
    
  })

  it('первая RU-запись: en и de помечаются stale', () => {
    const out = markTranslationsStale(args({ data: { title: 'Тюлень' }, locale: 'ru' })) as {
      localeStatus: Array<{ locale: string; status: string; sourceHash: string | null }>
    }
    expect(out.localeStatus.map((s) => s.locale).sort()).toEqual(['en'])
    for (const s of out.localeStatus) {
      expect(s.status).toBe('stale')
      expect(s.sourceHash).toBeNull()
    }
  })

  it('no-op запись при актуальном переводе: статус current сохраняется', () => {
    const hash = hashOf('Тюлень')
    const prev = [
      { locale: 'en', status: 'current', sourceHash: hash, translatedAt: '2026-07-01' },
      { locale: 'de', status: 'current', sourceHash: hash, translatedAt: '2026-07-01' },
    ]
    const out = markTranslationsStale(
      args({ data: { title: 'Тюлень', localeStatus: prev }, locale: 'ru' }),
    ) as { localeStatus: Array<{ status: string; translatedAt: string | null }> }
    for (const s of out.localeStatus) {
      expect(s.status).toBe('current')
      expect(s.translatedAt).toBe('2026-07-01')
    }
  })

  it('смена RU-текста: переводы флипаются в stale, translatedAt/sourceHash сохраняются', () => {
    const oldHash = hashOf('Тюлень')
    const prev = [
      { locale: 'en', status: 'current', sourceHash: oldHash, translatedAt: '2026-07-01' },
      { locale: 'de', status: 'current', sourceHash: oldHash, translatedAt: '2026-07-01' },
    ]
    const out = markTranslationsStale(
      args({ data: { title: 'Морж', localeStatus: prev }, locale: 'ru' }),
    ) as { localeStatus: Array<{ status: string; sourceHash: string; translatedAt: string }> }
    for (const s of out.localeStatus) {
      expect(s.status).toBe('stale')
      expect(s.sourceHash).toBe(oldHash) // агент-переводчик перезапишет после перевода
      expect(s.translatedAt).toBe('2026-07-01')
    }
  })

  it('partial-update без localeStatus: прежнее состояние берётся из originalDoc, не теряется', () => {
    const hash = hashOf('Тюлень')
    const originalDoc = {
      title: 'Тюлень',
      localeStatus: [
        { locale: 'en', status: 'current', sourceHash: hash, translatedAt: '2026-07-01' },
        { locale: 'de', status: 'current', sourceHash: hash, translatedAt: '2026-07-01' },
      ],
    }
    // data без title/body (например, обновили только topics) — hash должен считаться
    // от originalDoc, а не от пустых строк (иначе ложный stale).
    const out = markTranslationsStale(
      args({ data: { topics: ['seals'] }, locale: 'ru', originalDoc }),
    ) as { localeStatus: Array<{ status: string; translatedAt: string | null }> }
    for (const s of out.localeStatus) {
      expect(s.status).toBe('current')
      expect(s.translatedAt).toBe('2026-07-01')
    }
  })

  it('req.locale не задан (агентные partial-записи) — считается исходной локалью', () => {
    const out = markTranslationsStale(args({ data: { title: 'Тюлень' } })) as {
      localeStatus: unknown[]
    }
    expect(out.localeStatus).toHaveLength(1) // targetLocales = [en]
  })
})
