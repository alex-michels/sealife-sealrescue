import { describe, it, expect } from 'vitest'
import { applySectionOverride, type SectionOverrideRow } from '@/site/sectionContent'
import { getSection } from '@/site/sections'
import { cardCover } from '@/app/(frontend)/_components/content/getGames'
import type { Media } from '@/payload-types'

/**
 * M1-T27: мерж admin-overrides с разделами из кода — чистая логика.
 * Инвариант: БД может только ДОПОЛНЯТЬ (title/intro/cover), не создавать/ломать разделы.
 */

const games = getSection('sealife', 'games')!
const media = { id: 1, alt: 'обложка', url: '/media/x.jpg' } as unknown as Media

describe('applySectionOverride', () => {
  it('без overrides: раздел из кода, cover нет', () => {
    const out = applySectionOverride(games, [], 'ru')
    expect(out.title).toEqual(games.title)
    expect(out.intro).toEqual(games.intro)
    expect(out.cover).toBeNull()
  })

  it('override title/intro действует ТОЛЬКО на свою локаль, остальные — из кода', () => {
    const rows: SectionOverrideRow[] = [{ section: 'games', title: 'Игротека', intro: 'Новый лид' }]
    const out = applySectionOverride(games, rows, 'ru')
    expect(out.title.ru).toBe('Игротека')
    expect(out.intro.ru).toBe('Новый лид')
    expect(out.title.en).toBe(games.title.en) // en не тронут
  })

  it('пустое/пробельное значение → fallback на код', () => {
    for (const empty of [null, undefined, '', '   ']) {
      const out = applySectionOverride(games, [{ section: 'games', title: empty }], 'en')
      expect(out.title.en, String(empty)).toBe(games.title.en)
    }
  })

  it('строка с неизвестным slug игнорируется (не может сломать раздел)', () => {
    const rows: SectionOverrideRow[] = [{ section: 'no-such-section', title: 'Взлом' }]
    const out = applySectionOverride(games, rows, 'ru')
    expect(out.title).toEqual(games.title)
  })

  it('cover: populated media проходит, непопулированный id → null', () => {
    expect(applySectionOverride(games, [{ section: 'games', cover: media }], 'ru').cover).toBe(media)
    expect(applySectionOverride(games, [{ section: 'games', cover: 42 }], 'ru').cover).toBeNull()
  })

  it('структура раздела неизменяема overrides: slug/site/nav/hasDetail всегда из кода', () => {
    const out = applySectionOverride(games, [{ section: 'games', title: 'X' }], 'ru')
    expect(out.slug).toBe(games.slug)
    expect(out.site).toBe(games.site)
    expect(out.nav).toBe(games.nav)
    expect(out.hasDetail).toBe(games.hasDetail)
  })
})

describe('cardCover (обложка карточки игры)', () => {
  it('populated картинка показывается по умолчанию', () => {
    expect(cardCover({ coverImage: media, showCardCover: true })).toBe(media)
    expect(cardCover({ coverImage: media, showCardCover: null })).toBe(media)
  })

  it('showCardCover=false скрывает картинку (плейсхолдер), не удаляя её', () => {
    expect(cardCover({ coverImage: media, showCardCover: false })).toBeNull()
  })

  it('без картинки (или непопулированный id) → null → плейсхолдер', () => {
    expect(cardCover({ coverImage: null, showCardCover: true })).toBeNull()
    expect(cardCover({ coverImage: 7, showCardCover: true })).toBeNull()
  })
})
