import crypto from 'crypto'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

/**
 * QA-14 (int-слой): markTranslationsStale на живом Payload — трекинг integrity перевода.
 * (forceAgentDrafts на живом Payload закреплён в access-matrix.int.spec.ts, QA-13.)
 */

const RUN = `qa14-${Date.now()}`
const hashOf = (title: string, body: unknown = '') =>
  crypto.createHash('sha256').update(`${title}\n${JSON.stringify(body)}`).digest('hex')

type LocaleStatus = Array<{
  locale: string
  status?: string | null
  sourceHash?: string | null
  translatedAt?: string | null
}>

let payload: Payload
let docId: number | string

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const doc = await payload.create({
    collection: 'content',
    data: { type: 'article', title: `${RUN} Тюлень`, slug: `${RUN}-doc`, _status: 'published' },
    locale: 'ru',
  })
  docId = doc.id
}, 120_000)

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'content', where: { slug: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 120_000)

describe('markTranslationsStale (live Payload)', () => {
  it('создание RU-документа помечает en как stale', async () => {
    const doc = await payload.findByID({ collection: 'content', id: docId, locale: 'ru' })
    const ls = (doc.localeStatus ?? []) as LocaleStatus
    expect(ls.map((s) => s.locale).sort()).toEqual(['en'])
    for (const s of ls) expect(s.status).toBe('stale')
  })

  it('перевод «фиксируется» правильным sourceHash и переживает no-op RU-запись', async () => {
    // Агент-переводчик: записывает актуальный hash исходника + status current.
    const currentHash = hashOf(`${RUN} Тюлень`)
    const fixed = await payload.update({
      collection: 'content',
      id: docId,
      locale: 'ru',
      data: {
        title: `${RUN} Тюлень`,
        localeStatus: [
          { locale: 'en', status: 'current', sourceHash: currentHash, translatedAt: '2026-07-01' },
          { locale: 'de', status: 'current', sourceHash: currentHash, translatedAt: '2026-07-01' },
        ],
      },
    })
    for (const s of (fixed.localeStatus ?? []) as LocaleStatus) {
      expect(s.status, `after fix: ${s.locale}`).toBe('current')
    }

    // No-op RU-запись (тот же title) — переводы остаются current.
    const noop = await payload.update({
      collection: 'content',
      id: docId,
      locale: 'ru',
      data: { title: `${RUN} Тюлень` },
    })
    for (const s of (noop.localeStatus ?? []) as LocaleStatus) {
      expect(s.status, `after no-op: ${s.locale}`).toBe('current')
    }
  })

  it('partial-update без title/body (только topics) НЕ флипает переводы в stale', async () => {
    const updated = await payload.update({
      collection: 'content',
      id: docId,
      locale: 'ru',
      data: { topics: ['biology'] } as never,
    })
    for (const s of (updated.localeStatus ?? []) as LocaleStatus) {
      expect(s.status, s.locale).toBe('current')
    }
  })

  it('смена RU-текста флипает переводы в stale, сохраняя translatedAt', async () => {
    const updated = await payload.update({
      collection: 'content',
      id: docId,
      locale: 'ru',
      data: { title: `${RUN} Морж` },
    })
    for (const s of (updated.localeStatus ?? []) as LocaleStatus) {
      expect(s.status, s.locale).toBe('stale')
      expect(s.translatedAt).toBeTruthy() // не потеряли метку перевода
    }
  })

  it('запись EN-локали не трогает localeStatus', async () => {
    const before = await payload.findByID({ collection: 'content', id: docId, locale: 'ru' })
    await payload.update({
      collection: 'content',
      id: docId,
      locale: 'en',
      data: { title: `${RUN} Seal (en)` },
    })
    const after = await payload.findByID({ collection: 'content', id: docId, locale: 'ru' })
    expect((after.localeStatus ?? []) as LocaleStatus).toEqual(
      (before.localeStatus ?? []) as LocaleStatus,
    )
  })
})
