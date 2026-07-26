import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import { locales, defaultLocale, type Locale } from '@/i18n/config'
import { translatedWhere, localesWithContent } from '@/i18n/translated'

/**
 * **CR-01** — непереведённый документ не выдаёт себя за переведённый.
 *
 * До этой правки у Payload был включён глобальный locale-fallback, и он падает на `defaultLocale`.
 * Значит документ, написанный только на исходной локали, возвращался ПОЛНОСТЬЮ ЗАПОЛНЕННЫМ при
 * запросе другой: исходный заголовок в чужом списке, исходное тело по чужому URL, `hreflang`
 * чужого языка и такой же URL в sitemap. Инвариант №3 требует ровно обратного — перевод заранее,
 * в хранилище, с hreflang, и никакого перевода «на лету».
 *
 * Эта спека — и регрессионный тест правки, и ЗАПИСЬ ИЗМЕРЕННОГО ПОВЕДЕНИЯ Payload, на котором
 * держится реализация гейта. Если апгрейд Payload поменяет семантику операторов, красным станет
 * именно она, а не какая-нибудь страница через полгода.
 */

const other = locales.find((l) => l !== defaultLocale)!

describe('CR-01: locale fallback и гейт перевода', () => {
  let payload: Payload
  const created: number[] = []

  const mk = async (slug: string, locale: Locale, title: string) => {
    const doc = await payload.create({
      collection: 'content',
      locale,
      data: { type: 'article', slug, title, _status: 'published' },
    })
    created.push(doc.id as number)
    return doc
  }

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterAll(async () => {
    for (const id of created) {
      await payload.delete({ collection: 'content', id }).catch(() => {})
    }
  })

  it('конфиг: глобальный fallback выключен (иначе утечка открывается сразу на всех чтениях)', () => {
    expect(payload.config.localization && payload.config.localization.fallback).toBe(false)
  })

  it('документ на одной локали НЕ виден в другой через гейт, и виден в своей', async () => {
    const slug = 'cr01-source-only'
    await mk(slug, defaultLocale, 'Только исходная локаль')

    const gated = (locale: Locale) =>
      payload.find({
        collection: 'content',
        locale,
        fallbackLocale: false,
        where: { and: [{ slug: { equals: slug } }, translatedWhere('title')] },
        limit: 1,
      })

    expect((await gated(other)).docs).toHaveLength(0)
    expect((await gated(defaultLocale)).docs).toHaveLength(1)
  })

  it('без гейта fallbackLocale:false ВОЗВРАЩАЕТ документ с пустым title — опт-аута мало', async () => {
    // Ключевой замер: выключить фолбэк недостаточно, документ всё равно приходит в списки,
    // просто с пустым заголовком. Отсюда и нужен where-гейт, а не только opt-out.
    const slug = 'cr01-optout-only'
    await mk(slug, defaultLocale, 'Исходный заголовок')

    const { docs } = await payload.find({
      collection: 'content',
      locale: other,
      fallbackLocale: false,
      where: { slug: { equals: slug } },
      limit: 1,
    })

    expect(docs).toHaveLength(1)
    expect(docs[0]?.title).toBeFalsy()
  })

  /**
   * Замер, который исправил проектное допущение. Изначально гейт задумывался как защита ещё и от
   * «строка локали есть, а заголовок пустой». Оказалось, такого состояния через API не построить:
   * `title` объявлен `required`, и валидация Payload отклоняет И патч целевой локали без
   * заголовка, И запись пустой строки. То есть строка локали существует ⟺ заголовок непустой,
   * и рабочее условие гейта — `exists`. Второе условие оставлено осознанно как страховка на
   * случай данных в обход валидации (сид/прямой SQL) или снятия `required`; тесты ниже
   * фиксируют, что оно не мешает.
   */
  it('целевую локаль нельзя записать без заголовка — валидация не даёт', async () => {
    const slug = 'cr01-partial-target'
    const doc = await mk(slug, defaultLocale, 'Исходный заголовок')

    await expect(
      payload.update({
        collection: 'content',
        id: doc.id,
        locale: other,
        data: { provenance: { aiTranslated: true } },
      }),
    ).rejects.toThrow(/Title/i)

    // Раз строки нет — гейт по-прежнему исключает документ в чужой локали.
    const { docs } = await payload.find({
      collection: 'content',
      locale: other,
      fallbackLocale: false,
      where: { and: [{ slug: { equals: slug } }, translatedWhere('title')] },
      limit: 1,
    })
    expect(docs).toHaveLength(0)
  })

  it('пустой заголовок перевода тоже отклоняется валидацией', async () => {
    const slug = 'cr01-empty-string'
    const doc = await mk(slug, defaultLocale, 'Исходный заголовок')
    await payload.update({
      collection: 'content',
      id: doc.id,
      locale: other,
      data: { title: 'Временный перевод' },
    })

    await expect(
      payload.update({ collection: 'content', id: doc.id, locale: other, data: { title: '' } }),
    ).rejects.toThrow(/Title/i)
  })

  it('localesWithContent отдаёт только локали с текстом — один источник для hreflang и sitemap', async () => {
    const slugOne = 'cr01-avail-one'
    const slugBoth = 'cr01-avail-both'
    await mk(slugOne, defaultLocale, 'Только исходная')
    const both = await mk(slugBoth, defaultLocale, 'Исходная')
    await payload.update({
      collection: 'content',
      id: both.id,
      locale: other,
      data: { title: 'Translated' },
    })

    const map = await localesWithContent(payload, 'content', {
      _status: { equals: 'published' },
    })

    expect([...(map.get(slugOne) ?? [])]).toEqual([defaultLocale])
    expect([...(map.get(slugBoth) ?? [])].sort()).toEqual([...locales].sort())
  })

  it('переведённый документ виден в обеих локалях со своим текстом', async () => {
    const slug = 'cr01-translated'
    const doc = await mk(slug, defaultLocale, 'Исходный текст')
    await payload.update({
      collection: 'content',
      id: doc.id,
      locale: other,
      data: { title: 'Translated text' },
    })

    const read = async (locale: Locale) => {
      const { docs } = await payload.find({
        collection: 'content',
        locale,
        fallbackLocale: false,
        where: { and: [{ slug: { equals: slug } }, translatedWhere('title')] },
        limit: 1,
      })
      return docs[0]?.title
    }

    expect(await read(defaultLocale)).toBe('Исходный текст')
    expect(await read(other)).toBe('Translated text')
  })
})
