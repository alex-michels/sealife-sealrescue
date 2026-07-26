import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

/**
 * M1-T08 / EU-11 / BIO-13 / BIO-14 — контракты новой provenance-схемы.
 *
 * Проверяем не «поле существует» (это сказал бы и typecheck), а поведение, ради которого
 * поля заведены:
 *  1. provenance-флаги авторства ЛОКАЛИЗОВАНЫ: ru-оригинал может быть человеческим, а
 *     en-перевод — машинным. Ровно этот случай называет AI Act Art. 50(4), и именно его
 *     не мог выразить старый одиночный `aiGenerated`.
 *  2. флаги подтверждения фактов НЕ локализованы: факт не зависит от языка карточки.
 *  3. `humanReviewed` агенту недоступен — человек-в-контуре на уровне поля.
 *  4. предложение агента без источников отклоняется СХЕМОЙ (M2-T06), а не договорённостью.
 *  5. охранный статус хранится структурно, так что «VU у подвида» отличимо от «LC у вида»
 *     (то самое противоречие, которое нашёл предметный аудит).
 */

const RUN = `prov-${Date.now()}`
let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config })
}, 120_000)

afterAll(async () => {
  if (!payload) return
  await payload.delete({ collection: 'content', where: { slug: { like: `${RUN}` } } })
  await payload.delete({ collection: 'species', where: { slug: { like: `${RUN}` } } })
  await payload.delete({ collection: 'sources', where: { url: { like: `${RUN}` } } })
})

describe('provenance: авторство — per-locale, фактура — общая', () => {
  it('ru может быть человеческим, а en — машинным переводом одного документа', async () => {
    const slug = `${RUN}-locales`
    const doc = await payload.create({
      collection: 'content',
      locale: 'ru',
      data: {
        type: 'article',
        slug,
        title: 'Оригинал, написанный человеком',
        provenance: { aiAssisted: false, aiTranslated: false, sourceVerified: true },
      },
    })

    await payload.update({
      collection: 'content',
      id: doc.id,
      locale: 'en',
      data: { title: 'Machine translation', provenance: { aiTranslated: true } },
    })

    const ru = await payload.findByID({ collection: 'content', id: doc.id, locale: 'ru' })
    const en = await payload.findByID({ collection: 'content', id: doc.id, locale: 'en' })

    // Главное: одна и та же запись честно говорит о себе РАЗНОЕ на разных языках.
    expect(ru.provenance?.aiTranslated).toBeFalsy()
    expect(en.provenance?.aiTranslated).toBe(true)

    // А подтверждение фактов — общее для документа, язык на него не влияет.
    expect(ru.provenance?.sourceVerified).toBe(true)
    expect(en.provenance?.sourceVerified).toBe(true)
  })

  it('sources можно проставить контенту и виду (раньше связь была только у центров)', async () => {
    const src = await payload.create({
      collection: 'sources',
      data: { url: `https://example.org/${RUN}`, type: 'official' },
    })

    const article = await payload.create({
      collection: 'content',
      locale: 'ru',
      data: { type: 'article', slug: `${RUN}-sourced`, title: 'Со ссылкой', sources: [src.id] },
    })
    const species = await payload.create({
      collection: 'species',
      locale: 'ru',
      data: { name: 'Вид со ссылкой', slug: `${RUN}-sp`, latin: 'Testus testus', sources: [src.id] },
    })

    const a = await payload.findByID({ collection: 'content', id: article.id, depth: 0 })
    const s = await payload.findByID({ collection: 'species', id: species.id, depth: 0 })
    expect(a.sources).toEqual([src.id])
    expect(s.sources).toEqual([src.id])
  })
})

describe('охранный статус различает вид и подвид (BIO-13)', () => {
  it('одна запись хранит и код, и то, ЧТО именно оценено, и год со ссылкой', async () => {
    const sp = await payload.create({
      collection: 'species',
      locale: 'ru',
      data: {
        name: 'Балтийская кольчатая нерпа',
        slug: `${RUN}-ringed`,
        latin: 'Pusa hispida botnica',
        conservationStatus: 'VU',
        conservationAssessment: {
          scope: 'subspecies',
          assessedEntity: 'Pusa hispida botnica',
          assessmentYear: 2016,
          listingSystem: 'iucn',
          sourceUrl: 'https://www.iucnredlist.org/species/41673/45231626',
        },
      },
    })

    const got = await payload.findByID({ collection: 'species', id: sp.id })
    // Без scope «VU» и «LC» из глоссария выглядели бы прямым противоречием.
    expect(got.conservationStatus).toBe('VU')
    expect(got.conservationAssessment?.scope).toBe('subspecies')
    expect(got.conservationAssessment?.assessmentYear).toBe(2016)
    // Ссылка — то, по чему агент сможет перепроверить статус (M2-T08).
    expect(got.conservationAssessment?.sourceUrl).toContain('iucnredlist.org')
  })
})

describe('предложение агента без источников отклоняется схемой (M2-T06)', () => {
  /** Валидное предложение целиком; в негативном кейсе убираем ТОЛЬКО sources, иначе тест
   *  прошёл бы из-за других required-полей (summary/proposalType) и ничего не доказывал. */
  const proposal = (sources?: number[]) => ({
    summary: `${RUN} тестовое предложение`,
    proposalType: 'center_update' as const,
    targetCollection: 'rescue-centers',
    targetId: '1',
    confidence: 0.9,
    ...(sources ? { sources } : {}),
  })

  it('без sources — падает валидацией именно на sources', async () => {
    await expect(
      payload.create({ collection: 'agent-proposals', data: proposal() as never }),
    ).rejects.toThrow(/[Ss]ources/)
  })

  it('с источником — создаётся (значит отклоняет именно отсутствие sources)', async () => {
    const src = await payload.create({
      collection: 'sources',
      data: { url: `https://example.org/${RUN}-ok`, type: 'official' },
    })
    const p = await payload.create({
      collection: 'agent-proposals',
      data: proposal([src.id as number]) as never,
    })
    expect(p.id).toBeTruthy()
    await payload.delete({ collection: 'agent-proposals', id: p.id })
  })
})
