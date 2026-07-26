import crypto from 'crypto'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { defaultLocale, targetLocales } from '@/i18n/config'

/**
 * QA-14 (int-слой): markTranslationsStale на живом Payload — трекинг integrity перевода.
 * (forceAgentDrafts на живом Payload закреплён в access-matrix.int.spec.ts, QA-13.)
 *
 * Направление перевода берётся из `@/i18n/config`, а не пришпилено литералами: после **CR-14**
 * исходная локаль — en, целевая — ru. Литералы направления живут ровно в одном файле,
 * `tests/unit/i18n.unit.spec.ts`.
 */

const RUN = `qa14-${Date.now()}`
const hashOf = (title: string, body: unknown = '') =>
  crypto
    .createHash('sha256')
    .update(`${title}\n${JSON.stringify(body)}`)
    .digest('hex')

type LocaleStatus = Array<{
  locale: string
  status?: string | null
  sourceHash?: string | null
  translatedAt?: string | null
}>

let payload: Payload
let docId: number | string

const SOURCE_TITLE = `${RUN} Seal`

beforeAll(async () => {
  payload = await getPayload({ config: await config })
  const doc = await payload.create({
    collection: 'content',
    data: { type: 'article', title: SOURCE_TITLE, slug: `${RUN}-doc`, _status: 'published' },
    locale: defaultLocale,
  })
  docId = doc.id
}, 120_000)

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'content', where: { slug: { like: `${RUN}-` } } })
  await payload.db.destroy?.()
}, 120_000)

describe('markTranslationsStale (live Payload)', () => {
  it('создание документа в исходной локали помечает целевые как stale', async () => {
    const doc = await payload.findByID({ collection: 'content', id: docId, locale: defaultLocale })
    const ls = (doc.localeStatus ?? []) as LocaleStatus
    expect(ls.map((s) => s.locale).sort()).toEqual([...targetLocales].sort())
    for (const s of ls) expect(s.status).toBe('stale')
  })

  it('перевод «фиксируется» правильным sourceHash и переживает no-op запись исходника', async () => {
    // Агент-переводчик: записывает актуальный hash исходника + status current.
    const currentHash = hashOf(SOURCE_TITLE)
    const fixed = await payload.update({
      collection: 'content',
      id: docId,
      locale: defaultLocale,
      data: {
        title: SOURCE_TITLE,
        localeStatus: targetLocales.map((locale) => ({
          locale,
          status: 'current',
          sourceHash: currentHash,
          translatedAt: '2026-07-01',
        })),
      },
    })
    for (const s of (fixed.localeStatus ?? []) as LocaleStatus) {
      expect(s.status, `after fix: ${s.locale}`).toBe('current')
    }

    // No-op запись исходной локали (тот же title) — переводы остаются current.
    const noop = await payload.update({
      collection: 'content',
      id: docId,
      locale: defaultLocale,
      data: { title: SOURCE_TITLE },
    })
    for (const s of (noop.localeStatus ?? []) as LocaleStatus) {
      expect(s.status, `after no-op: ${s.locale}`).toBe('current')
    }
  })

  it('partial-update без title/body (только topics) НЕ флипает переводы в stale', async () => {
    const updated = await payload.update({
      collection: 'content',
      id: docId,
      locale: defaultLocale,
      data: { topics: ['biology'] } as never,
    })
    for (const s of (updated.localeStatus ?? []) as LocaleStatus) {
      expect(s.status, s.locale).toBe('current')
    }
  })

  it('смена исходного текста флипает переводы в stale, сохраняя translatedAt', async () => {
    const updated = await payload.update({
      collection: 'content',
      id: docId,
      locale: defaultLocale,
      data: { title: `${RUN} Walrus` },
    })
    for (const s of (updated.localeStatus ?? []) as LocaleStatus) {
      expect(s.status, s.locale).toBe('stale')
      expect(s.translatedAt).toBeTruthy() // не потеряли метку перевода
    }
  })

  it('запись целевой локали не трогает localeStatus', async () => {
    const read = () => payload.findByID({ collection: 'content', id: docId, locale: defaultLocale })

    const before = await read()
    for (const locale of targetLocales) {
      await payload.update({
        collection: 'content',
        id: docId,
        locale,
        data: { title: `${RUN} перевод (${locale})` },
      })
    }
    const after = await read()
    expect((after.localeStatus ?? []) as LocaleStatus).toEqual(
      (before.localeStatus ?? []) as LocaleStatus,
    )
  })
})
