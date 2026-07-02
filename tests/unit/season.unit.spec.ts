import { describe, it, expect } from 'vitest'
import { currentSeason, seasonEnd } from '@/endpoints/leaderboard'

/**
 * QA-17: ISO-неделя сезона лидерборда на граничных датах. Ошибка здесь = молчаливый
 * сброс/раздвоение недельной доски (playerKey и прунинг завязаны на season-строку).
 * Детерминизм mulberry32/hashStr закреплён в leaderboard-alias.unit.spec.ts (QA-10/16).
 */

const at = (iso: string) => new Date(iso)

describe('currentSeason (ISO-неделя, UTC)', () => {
  it('обычная неделя: стабильна с понедельника по воскресенье', () => {
    // 2026-W27 = Пн 2026-06-29 … Вс 2026-07-05
    expect(currentSeason(at('2026-06-29T00:00:00Z'))).toBe('2026-W27')
    expect(currentSeason(at('2026-07-02T15:00:00Z'))).toBe('2026-W27')
    expect(currentSeason(at('2026-07-05T23:59:59Z'))).toBe('2026-W27')
  })

  it('перелом недели: воскресенье → понедельник', () => {
    expect(currentSeason(at('2026-07-05T23:59:59Z'))).toBe('2026-W27')
    expect(currentSeason(at('2026-07-06T00:00:00Z'))).toBe('2026-W28')
  })

  it('смена года: конец декабря принадлежит W01 СЛЕДУЮЩЕГО ISO-года', () => {
    // Пн 2025-12-29 … Вс 2026-01-04 содержит четверг 2026-01-01 → 2026-W01.
    expect(currentSeason(at('2025-12-29T00:00:00Z'))).toBe('2026-W01')
    expect(currentSeason(at('2025-12-31T12:00:00Z'))).toBe('2026-W01')
    expect(currentSeason(at('2026-01-01T00:00:00Z'))).toBe('2026-W01')
    expect(currentSeason(at('2026-01-04T23:59:59Z'))).toBe('2026-W01')
    expect(currentSeason(at('2026-01-05T00:00:00Z'))).toBe('2026-W02')
  })

  it('53-недельный ISO-год (2026 начинается в четверг → есть W53)', () => {
    expect(currentSeason(at('2026-12-28T00:00:00Z'))).toBe('2026-W53')
    expect(currentSeason(at('2027-01-03T23:59:59Z'))).toBe('2026-W53')
    expect(currentSeason(at('2027-01-04T00:00:00Z'))).toBe('2027-W01')
  })

  it('номер недели двузначный с ведущим нулём (лексикографическая сортировка сезонов)', () => {
    expect(currentSeason(at('2026-01-15T00:00:00Z'))).toMatch(/^2026-W0\d$/)
  })
})

describe('seasonEnd (следующий понедельник 00:00 UTC)', () => {
  it('из середины недели', () => {
    expect(seasonEnd(at('2026-07-01T12:00:00Z')).toISOString()).toBe('2026-07-06T00:00:00.000Z')
  })

  it('из воскресенья — завтра', () => {
    expect(seasonEnd(at('2026-07-05T23:59:59Z')).toISOString()).toBe('2026-07-06T00:00:00.000Z')
  })

  it('из понедельника — ЧЕРЕЗ неделю (текущий сезон только начался)', () => {
    expect(seasonEnd(at('2026-07-06T00:00:00Z')).toISOString()).toBe('2026-07-13T00:00:00.000Z')
  })

  it('инварианты на 60 днях подряд: конец строго в будущем, сезон стабилен до конца и меняется после', () => {
    for (let i = 0; i < 60; i++) {
      const d = new Date(Date.UTC(2026, 5, 1 + i, 9, 30))
      const end = seasonEnd(d)
      expect(end.getTime()).toBeGreaterThan(d.getTime())
      expect(end.getUTCDay()).toBe(1) // всегда понедельник
      // За миллисекунду до конца — тот же сезон; в момент конца — следующий.
      expect(currentSeason(new Date(end.getTime() - 1))).toBe(currentSeason(d))
      expect(currentSeason(end)).not.toBe(currentSeason(d))
    }
  })
})
