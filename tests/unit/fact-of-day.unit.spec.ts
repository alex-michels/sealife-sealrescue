import { describe, it, expect } from 'vitest'
import { dayNumberUTC, dailyIndex, pickOfDay } from '@/content/factOfDay'

/** «Факт дня» (M1-T03): детерминирован по UTC-дате, без хранилища. */
describe('factOfDay', () => {
  const day = new Date('2026-07-02T15:30:00Z')

  it('dayNumberUTC is stable within a UTC day and increments at midnight UTC', () => {
    expect(dayNumberUTC(new Date('2026-07-02T00:00:00Z'))).toBe(
      dayNumberUTC(new Date('2026-07-02T23:59:59Z')),
    )
    expect(dayNumberUTC(new Date('2026-07-03T00:00:00Z'))).toBe(dayNumberUTC(day) + 1)
  })

  it('dailyIndex stays in [0, length) and is deterministic', () => {
    for (const len of [1, 2, 7, 100]) {
      const i = dailyIndex(len, day)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(len)
      expect(dailyIndex(len, day)).toBe(i)
    }
  })

  it('rotates daily: consecutive days move the index by one (mod length)', () => {
    const next = new Date('2026-07-03T12:00:00Z')
    expect(dailyIndex(10, next)).toBe((dailyIndex(10, day) + 1) % 10)
  })

  it('empty list → -1 / undefined (empty-состояние, не падение)', () => {
    expect(dailyIndex(0, day)).toBe(-1)
    expect(dailyIndex(-5, day)).toBe(-1)
    expect(pickOfDay([], day)).toBeUndefined()
  })

  it('pickOfDay returns the element at the daily index', () => {
    const items = ['a', 'b', 'c']
    expect(pickOfDay(items, day)).toBe(items[dailyIndex(items.length, day)])
  })
})
