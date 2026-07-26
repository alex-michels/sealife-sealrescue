import { describe, it, expect } from 'vitest'
import { seedOwnership, skipExplanation } from '@/seed/ownership'

/**
 * **CR-03** — сид не затирает работу человека.
 *
 * Сид делает upsert по slug и перезаписывает текст, статус и провенанс. До этой правки первая же
 * настоящая статья под сеяным slug'ом умирала при следующем прогоне: текст заменён, публикация
 * снята, авторство переписано на AI — и всё это молча, с отчётом «updated».
 */

const SEED_TITLE = 'Почему тюлени плачут'

describe('seedOwnership', () => {
  it('нетронутый черновик сида — обновляем', () => {
    expect(
      seedOwnership(
        { _status: 'draft', provenance: { humanReviewed: false } },
        SEED_TITLE,
        SEED_TITLE,
      ),
    ).toEqual({ owned: true })
  })

  it('опубликованную запись не трогаем — публикация это человеческое действие', () => {
    // Инвариант №1: публикует человек. Сид, снимающий публикацию, удаляет материал с сайта.
    expect(seedOwnership({ _status: 'published' }, SEED_TITLE, SEED_TITLE)).toEqual({
      owned: false,
      reason: 'published',
    })
  })

  it('вычитанную человеком не трогаем — перезапись стёрла бы и текст, и факт вычитки', () => {
    expect(
      seedOwnership(
        { _status: 'draft', provenance: { humanReviewed: true } },
        SEED_TITLE,
        SEED_TITLE,
      ),
    ).toEqual({ owned: false, reason: 'humanReviewed' })
  })

  it('отредактированную не трогаем — заголовок разошёлся с сидовым', () => {
    expect(seedOwnership({ _status: 'draft' }, 'Мой настоящий заголовок', SEED_TITLE)).toEqual({
      owned: false,
      reason: 'edited',
    })
  })

  it('пустой заголовок в БД тоже считается расхождением, а не совпадением', () => {
    // Иначе запись с потерянным заголовком молча получила бы сидовый текст поверх.
    expect(seedOwnership({ _status: 'draft' }, null, SEED_TITLE)).toEqual({
      owned: false,
      reason: 'edited',
    })
  })

  it('приоритет причин: published важнее правки заголовка', () => {
    // Обе причины истинны; в логе полезнее увидеть более сильную.
    expect(seedOwnership({ _status: 'published' }, 'другой', SEED_TITLE)).toEqual({
      owned: false,
      reason: 'published',
    })
  })

  it('у каждой причины есть объяснение для лога', () => {
    // Молчаливый пропуск так же плох, как молчаливая перезапись.
    for (const reason of ['published', 'humanReviewed', 'edited'] as const) {
      expect(skipExplanation[reason], reason).toBeTruthy()
    }
  })
})
