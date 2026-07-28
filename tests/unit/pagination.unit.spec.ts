import { describe, it, expect } from 'vitest'
import { parsePage, pageCount, pageHref, pageWindow, PER_PAGE } from '@/content/pagination'

/**
 * **CR-07** — пагинация списков.
 *
 * До неё у всех списочных запросов стоял `pagination: false`: каждый показ раздела читал таблицу
 * целиком. Невидимо на девяти черновиках, заметно на 50–100 документах — то есть ровно на
 * горизонте M1-T07.
 */

describe('parsePage', () => {
  it('нормальный номер', () => {
    expect(parsePage('3')).toBe(3)
  })

  it('мусор из query не роняет роут, а даёт первую страницу', () => {
    // Параметр приходит снаружи: `?page=abc` не повод падать.
    for (const bad of ['abc', '', '0', '-2', '1.5', undefined, 'NaN']) {
      expect(parsePage(bad), String(bad)).toBe(1)
    }
  })

  it('повторный параметр — берём первый', () => {
    expect(parsePage(['2', '9'])).toBe(2)
  })
})

describe('pageCount', () => {
  it('делится ровно и с остатком', () => {
    expect(pageCount(24, 12)).toBe(2)
    expect(pageCount(25, 12)).toBe(3)
  })

  it('пусто — всё равно одна страница (для пустого состояния)', () => {
    expect(pageCount(0)).toBe(1)
  })

  it('дефолт — PER_PAGE', () => {
    expect(pageCount(PER_PAGE + 1)).toBe(2)
  })
})

describe('pageHref', () => {
  it('первая страница — БЕЗ page в URL', () => {
    // Канонический адрес раздела не должен зависеть от того, пролистали ли на него назад.
    expect(pageHref('/ru/articles', 1)).toBe('/ru/articles')
  })

  it('вторая и дальше — с номером', () => {
    expect(pageHref('/ru/articles', 2)).toBe('/ru/articles?page=2')
  })

  it('прочие параметры сохраняются (фильтр по теме не теряется при листании)', () => {
    expect(pageHref('/ru/articles', 3, { topic: 'biology' })).toBe(
      '/ru/articles?topic=biology&page=3',
    )
    expect(pageHref('/ru/articles', 1, { topic: 'biology' })).toBe('/ru/articles?topic=biology')
  })

  it('пустые параметры не попадают в URL', () => {
    expect(pageHref('/ru/articles', 2, { topic: undefined })).toBe('/ru/articles?page=2')
  })
})

describe('pageWindow', () => {
  it('мало страниц — показываем все, без разрывов', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
  })

  it('одна страница', () => {
    expect(pageWindow(1, 1)).toEqual([1])
  })

  it('много страниц — окно вокруг текущей + первая и последняя', () => {
    // Без окна сотня страниц сама превращается в стену ссылок.
    expect(pageWindow(50, 100)).toEqual([1, null, 49, 50, 51, null, 100])
  })

  it('у краёв разрыв только с одной стороны', () => {
    expect(pageWindow(2, 100)).toEqual([1, 2, 3, null, 100])
    expect(pageWindow(99, 100)).toEqual([1, null, 98, 99, 100])
  })

  it('соседние номера не превращаются в разрыв из одного числа', () => {
    // 1 … 3 — разрыв ровно на одну страницу выглядел бы глупее, чем сама страница.
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5])
  })
})
