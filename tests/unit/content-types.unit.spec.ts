import { describe, it, expect } from 'vitest'
import { contentTypes, feedTypes, typeLabel } from '@/content/contentTypes'
import { locales } from '@/i18n/config'

/**
 * **CR-06** — лента главной показывает только редакционные типы, и подписи локализованы.
 *
 * Раньше лента фильтровала лишь по `_status`, поэтому первая же опубликованная служебная страница
 * (`about`, дальше контакты и редполитика) встала бы карточкой НАВЕРХ главной. А кикер печатал
 * `doc.type` сырым — читатель видел `article` вместо «Статья», причём только в ленте.
 */

describe('contentTypes', () => {
  it('редакционные типы в ленте, служебная страница — нет', () => {
    expect([...feedTypes].sort()).toEqual(['article', 'meme', 'news'])
    expect(feedTypes).not.toContain('page')
  })

  it('page объявлен, но помечен как не-ленточный — решение зафиксировано, а не забыто', () => {
    // Отсутствие ключа и «ключ есть, inFeed: false» — разные вещи: второе видно на ревью.
    expect(contentTypes.page).toBeDefined()
    expect(contentTypes.page.inFeed).toBe(false)
  })

  it('у каждого типа есть подпись на каждой контент-локали', () => {
    // Дырка здесь = сырой enum в интерфейсе, то есть ровно вторая половина CR-06.
    for (const type of Object.keys(contentTypes) as (keyof typeof contentTypes)[]) {
      for (const locale of locales) {
        expect(typeLabel(type, locale), `${type}/${locale}`).toBeTruthy()
        expect(typeLabel(type, locale), `${type}/${locale} — не сырой enum`).not.toBe(type)
      }
    }
  })

  it('подписи различаются по локали', () => {
    expect(typeLabel('article', 'ru')).toBe('Статья')
    expect(typeLabel('article', 'en')).toBe('Article')
  })
})
