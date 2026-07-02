import { describe, it, expect } from 'vitest'
import { makeParts as serverParts, renderEn } from '@/endpoints/leaderboard'

/**
 * QA-16: контракт идентичности server↔client — страховка «⚠️ KEEP IN SYNC» между
 * src/endpoints/leaderboard.ts (EN-копия списков) и public/games/seal-hunt-v1/core/alias.js
 * (клиент, RU/EN/DE). Расхождение списков, PATTERNS, PRNG или порядка бросков валит тест:
 * иначе имя на старте игры молча разойдётся со строкой на доске.
 */

// Плоский JS игры без типов — импорт по вычисленному URL, форму описываем сами.
type ClientAlias = {
  makeParts: (seed: number, game: string) => Record<string, number>
  renderName: (parts: Record<string, number>, lang: string) => string
}
const client = (await import(
  new URL('../../public/games/seal-hunt-v1/core/alias.js', import.meta.url).href
)) as ClientAlias

/**
 * Golden-вектора: зафиксированы 2026-07-02. Меняются ТОЛЬКО осознанно (правка списков
 * имён меняет идентичность существующих игроков; сервер освежит строки — см. QA-15
 * «смена name-списков»). RU/DE заодно фиксируют правила рода: Русалочка (ж.р.) →
 * «Брызгучая»; DE-род задаёт суффикс: Klops (m) → «Spritziger», Brötchen (n) → «Glitschiges».
 */
const GOLDEN = [
  { seed: 1, game: 'seal-the-hunter', en: 'Selkie Narwhal', ru: 'Селки-Нарвал', de: 'Selkie-Narwal' },
  { seed: 42, game: 'seal-the-hunter', en: 'Splashy Nixie Blob', ru: 'Брызгучая Русалочка-Пельмень', de: 'Spritziger Nixe-Klops' },
  { seed: 123456789, game: 'seal-the-hunter', en: 'Mighty Dumplet Blob', ru: 'Могучий Колобок-Пельмень', de: 'Mächtiger Teigkugel-Klops' },
  { seed: 42, game: 'seal-run', en: 'Slippery Nixie Bun', ru: 'Скользкая Русалочка-Булочка', de: 'Glitschiges Nixe-Brötchen' },
  { seed: 4294967295, game: 'seal-the-hunter', en: 'Pebbly Chonky Serpent', ru: 'Галечный Толстый Змей', de: 'Kieselige Pummelige Schlange' },
  { seed: 0, game: 'seal-the-hunter', en: 'Walrus Penguin', ru: 'Морж-Пингвин', de: 'Walross-Pinguin' },
] as const

describe('golden-вектора (server EN + client RU/EN/DE)', () => {
  for (const g of GOLDEN) {
    it(`(${g.seed}, ${g.game}) → «${g.en}»`, () => {
      const sp = serverParts(g.seed, g.game)
      const cp = client.makeParts(g.seed, g.game)
      expect(renderEn(sp)).toBe(g.en)
      expect(client.renderName(cp, 'en')).toBe(g.en)
      expect(client.renderName(cp, 'ru')).toBe(g.ru)
      expect(client.renderName(cp, 'de')).toBe(g.de)
    })
  }
})

describe('sweep: оба движка идентичны на широком диапазоне', () => {
  it('части и EN-рендер совпадают для 300 (seed, game)-пар', () => {
    // Детерминированная псевдослучайная выборка seed'ов, покрывающая весь uint32-диапазон:
    // при расхождении ДЛИНЫ любого списка индексы уедут на части выборки и тест упадёт.
    const seeds: number[] = [0, 1, 2, 4294967294, 4294967295]
    for (let i = 1; i <= 145; i++) seeds.push((i * 2654435761) >>> 0)
    for (const game of ['seal-the-hunter', 'seal-run']) {
      for (const seed of seeds) {
        const sp = serverParts(seed, game)
        const cp = client.makeParts(seed, game)
        expect(cp, `parts (${seed}, ${game})`).toEqual(sp)
        expect(client.renderName(cp, 'en'), `render (${seed}, ${game})`).toBe(renderEn(sp))
      }
    }
  })

  it('клиентский рендер всех локалей всегда непуст и без undefined', () => {
    for (let i = 0; i < 40; i++) {
      const parts = client.makeParts((i * 48271) >>> 0, 'seal-the-hunter')
      for (const lang of ['ru', 'en', 'de']) {
        const name = client.renderName(parts, lang)
        expect(name.length, `${i}/${lang}`).toBeGreaterThan(0)
        expect(name).not.toContain('undefined')
      }
    }
  })
})
