import { describe, it, expect } from 'vitest'
import { makeParts, renderEn } from '@/endpoints/leaderboard'

/**
 * Анонимная идентичность игрока (SH-06/07): имя — детерминированная f(seed, game).
 * Полный golden-контракт server↔client (сверка с core/alias.js) — QA-16; здесь
 * закрепляем серверные инварианты: детерминизм, соль по игре, правила рендера.
 */
describe('makeParts', () => {
  it('is deterministic for (seed, game)', () => {
    for (const seed of [0, 1, 42, 123456789, 4294967295]) {
      expect(makeParts(seed, 'seal-the-hunter')).toEqual(makeParts(seed, 'seal-the-hunter'))
    }
  })

  it('always includes a noun; optional parts are indices', () => {
    for (const seed of [0, 7, 99, 2024, 777777]) {
      const p = makeParts(seed, 'seal-the-hunter')
      expect(Number.isInteger(p.noun)).toBe(true)
      expect(p.noun).toBeGreaterThanOrEqual(0)
      for (const key of ['adj', 'mod', 'pref', 'suf'] as const) {
        if (p[key] != null) {
          expect(Number.isInteger(p[key])).toBe(true)
          expect(p[key]).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('salts by game slug — different games give different identities for some seeds', () => {
    const seeds = Array.from({ length: 50 }, (_, i) => i * 7919)
    const differs = seeds.some(
      (s) => renderEn(makeParts(s, 'seal-the-hunter')) !== renderEn(makeParts(s, 'seal-run')),
    )
    expect(differs).toBe(true)
  })
})

describe('renderEn', () => {
  // Индексы — из списков ADJ_EN/MOD_EN/NOUN_EN/PREFIX_EN/SUFFIX_EN в leaderboard.ts.
  // Если списки меняются (⚠️ KEEP IN SYNC с core/alias.js!) — тест сознательно падает.
  it('renders each name pattern', () => {
    expect(renderEn({ noun: 0 })).toBe('Seal')
    expect(renderEn({ adj: 0, noun: 0 })).toBe('Salty Seal')
    expect(renderEn({ mod: 2, noun: 4 })).toBe('Round Narwhal')
    expect(renderEn({ adj: 1, mod: 0, noun: 1 })).toBe('Brave Chonky Walrus')
    expect(renderEn({ pref: 1, noun: 2 })).toBe('Pup Whale')
    expect(renderEn({ noun: 3, suf: 0 })).toBe('Dolphin Bun')
    expect(renderEn({ adj: 2, noun: 5, suf: 4 })).toBe('Sleepy Spermwhale Pud')
  })

  it('round-trips makeParts output to a non-empty alias', () => {
    for (const seed of [0, 1, 2, 3, 4, 5]) {
      const alias = renderEn(makeParts(seed, 'seal-the-hunter'))
      expect(alias.length).toBeGreaterThan(0)
      // Никаких undefined в строке — индексы всегда в границах списков.
      expect(alias).not.toContain('undefined')
    }
  })
})
