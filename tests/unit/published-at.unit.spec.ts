import { describe, it, expect } from 'vitest'
import { nextPublishedAt } from '@/content/publishedAt'

/**
 * **CR-05** — дата выхода материала.
 *
 * До этого читателю показывался `updatedAt`, и по нему же сортировались лента главной и списки:
 * правка опечатки в старой статье поднимала её на первое место и передатировала перед читателем.
 * Для новостей (§18 MStV, journalistisch-redaktionell) это хуже, чем косметика.
 */

const NOW = '2026-07-27T10:00:00.000Z'
const EARLIER = '2026-03-01T08:00:00.000Z'

describe('nextPublishedAt', () => {
  it('первая публикация — ставим штамп', () => {
    expect(nextPublishedAt({ _status: 'published' }, null, NOW)).toBe(NOW)
  })

  it('черновик — даты нет: пока материал не вышел, «даты выхода» не существует', () => {
    expect(nextPublishedAt({ _status: 'draft' }, null, NOW)).toBeUndefined()
  })

  it('повторная запись опубликованного — дату НЕ двигаем', () => {
    // Правка опечатки не является новой публикацией: у читателя и поисковика дата уже есть.
    expect(
      nextPublishedAt(
        { _status: 'published' },
        { _status: 'published', publishedAt: EARLIER },
        NOW,
      ),
    ).toBeUndefined()
  })

  it('дата, выставленная человеком, не перетирается', () => {
    // Перенос старого материала / отложенная публикация: автоматика уступает редактору.
    expect(
      nextPublishedAt({ _status: 'published', publishedAt: EARLIER }, null, NOW),
    ).toBeUndefined()
  })

  it('partial-update без _status у опубликованного: статус берётся из прежнего состояния', () => {
    // Иначе правка одного поля выглядела бы как «статус не задан» и штамп не встал бы вовсе.
    expect(nextPublishedAt({}, { _status: 'published' }, NOW)).toBe(NOW)
  })

  it('partial-update без _status у черновика — по-прежнему без даты', () => {
    expect(nextPublishedAt({}, { _status: 'draft' }, NOW)).toBeUndefined()
  })

  it('дату очистили руками у опубликованного — ставим заново', () => {
    // Опубликованный материал без даты уехал бы в НАЧАЛО списков: Postgres при сортировке
    // `-publishedAt` ставит NULL первым. Дательный вакуум опаснее «неточной» даты.
    expect(
      nextPublishedAt({ publishedAt: null }, { _status: 'published', publishedAt: EARLIER }, NOW),
    ).toBe(NOW)
  })

  it('дату очистили у черновика — оставляем пустой', () => {
    expect(
      nextPublishedAt({ publishedAt: null }, { _status: 'draft', publishedAt: EARLIER }, NOW),
    ).toBeUndefined()
  })

  it('снятие с публикации не стирает дату выхода', () => {
    // Материал уже выходил; депубликация — не отмена факта выхода.
    expect(
      nextPublishedAt({ _status: 'draft' }, { _status: 'published', publishedAt: EARLIER }, NOW),
    ).toBeUndefined()
  })
})
