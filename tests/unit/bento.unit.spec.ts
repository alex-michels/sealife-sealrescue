import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { BENTO_SLOTS, factPool, realCover, tileState } from '@/content/bento'
import type { SpeciesFactsRow } from '@/app/(frontend)/_components/content/getSpecies'

/**
 * **M1-T05** — bento-хаб главной sealife.
 *
 * Здесь закреплены ровно те решения, которые легко «улучшить» обратно в баг: порядок слотов
 * (=иерархия §6a), запрет показывать данные для раздела на выдуманных источниках, отсев
 * непереведённых фактов и набор CSS-контрактов кинетичного вордмарка.
 */

const RAW = fs.readFileSync(path.join(process.cwd(), 'src/app/(frontend)/globals.css'), 'utf8')

/**
 * Комментарии вырезаны: в них перечислено то, что запрещено (`grid-auto-flow: dense`,
 * `transform` на заголовке), и проверка «этого нет в файле» ловила бы собственное объяснение.
 */
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, '')

/** Тело `@keyframes wordmark-tide` — то, ЧТО именно анимируется. */
const TIDE_FRAMES = CSS.match(/@keyframes wordmark-tide\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''

describe('BENTO_SLOTS', () => {
  it('порядок = приоритет §6a брифа, а не то, что нашлось в базе', () => {
    // Порядок DOM = визуальный порядок = порядок для клавиатуры и скринридера. Перестановка
    // «для красоты» ломает смысл фикс-иерархии, поэтому literal здесь намеренный.
    expect([...BENTO_SLOTS]).toEqual(['fact', 'quiz', 'meme', 'game', 'news', 'species'])
  })
})

describe('tileState', () => {
  it('данные есть — filled, нет — empty', () => {
    expect(tileState(true)).toBe('filled')
    expect(tileState(false)).toBe('empty')
  })

  it('mockBacked перебивает наличие данных: раздел на выдуманных источниках не показывает НИЧЕГО', () => {
    // Главная индексируется и стоит первой записью в sitemap, поэтому mock на ней обходит сразу
    // оба механизма CR-09 (noindex + фильтр sitemap). Пока флаг стоит — только «скоро».
    expect(tileState(true, true)).toBe('soon')
    expect(tileState(false, true)).toBe('soon')
  })
})

describe('factPool', () => {
  const row = (name: string, slug: string, facts: Array<string | null>): SpeciesFactsRow => ({
    name,
    slug,
    facts: facts.map((text) => ({ text: text as string })),
  })

  it('разворачивает факты всех видов в один плоский пул', () => {
    const pool = factPool([row('Seal', 'seal', ['a', 'b']), row('Walrus', 'walrus', ['c'])], 'en')
    expect(pool.map((f) => f.fact)).toEqual(['a', 'b', 'c'])
    expect(pool[0]).toEqual({ fact: 'a', name: 'Seal', href: '/en/species/seal' })
  })

  it('непереведённые факты отсеиваются (полевой случай CR-01)', () => {
    // Массив `facts` НЕ локализован — локализован только `facts.text`. Значит вид с переведённым
    // именем проходит гейт документа, а отдельные факты приходят пустыми. Пустая строка в пуле
    // обнулила бы «факт дня» для всей локали: pickOfDay берёт день % длину и однажды выбрал бы её.
    const pool = factPool([row('Тюлень', 'seal', ['есть', '', null, '   '])], 'ru')
    expect(pool.map((f) => f.fact)).toEqual(['есть'])
  })

  it('вид без фактов пул не ломает', () => {
    expect(factPool([{ name: 'Seal', slug: 'seal' }], 'en')).toEqual([])
  })

  it('href ведёт в текущую локаль', () => {
    expect(factPool([row('Тюлень', 'ringed-seal', ['ф'])], 'ru')[0].href).toBe(
      '/ru/species/ringed-seal',
    )
  })
})

/**
 * CSS-контракты. Проверяются текстом файла — предмет проверки здесь не «как выглядит», а
 * «какие свойства выбраны», и именно они каждый раз оказываются под угрозой при правках.
 */
describe('.bento (сетка)', () => {
  it('CSS Grid со СТАТИЧНОЙ картой областей на каждом брейкпоинте', () => {
    expect(CSS).toMatch(/\.bento\s*\{[^}]*display:\s*grid/)
    // Три карты: мобайл (1 колонка), 821+ (2), 1024+ (6).
    expect(CSS.match(/grid-template-areas:/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('без dense/masonry: визуальный порядок не расходится с DOM (§16)', () => {
    expect(CSS).not.toMatch(/grid-auto-flow:\s*dense/)
    expect(CSS).not.toMatch(/masonry/)
  })

  it('.card-grid остался flex-сеткой каталогов и под bento не переписан', () => {
    // Его рендерят все каталоги, лента, оба хаба разделов и скелет: переключение на grid
    // мгновенно переверстало бы семь потребителей, а `grid-column: span N` на flex не работает.
    expect(CSS).toMatch(/\.card-grid\s*\{[^}]*display:\s*flex/)
  })
})

describe('.kinetic-wordmark (кинетичный хэдлайн)', () => {
  const rule = CSS.slice(
    CSS.indexOf(".kinetic-wordmark"),
    CSS.indexOf('@keyframes wordmark-tide'),
  )

  it('один проход, а не infinite (§16 «не перегружать анимацией»)', () => {
    expect(rule).toMatch(/animation:\s*wordmark-tide\s+\d+ms\s+[a-z-]+\s+1\s*;/)
    expect(rule).not.toMatch(/animation:[^;]*infinite/)
  })

  it('анимируется только background-position — paint-only, без CLS и без сдвига hit-target', () => {
    // Рамка h1 не двигается: language-switcher.e2e закрывает меню кликом по h1, а Playwright
    // ждёт стабильности bounding box. Любой transform-цикл подвесил бы клик в таймаут.
    expect(TIDE_FRAMES).toMatch(/background-position/)
    expect(TIDE_FRAMES).not.toMatch(/transform|opacity|font-size|letter-spacing|width/)
  })

  it('покой = базовое состояние: кадр `to` совпадает с background-position класса', () => {
    // От этого зависит корректность при prefers-reduced-motion: глобальный блок мгновенно
    // доигрывает анимацию до конца, и конец обязан быть спокойным состоянием.
    expect(rule).toMatch(/background-position:\s*0%\s+50%/)
    expect(CSS).toMatch(/@keyframes wordmark-tide\s*\{[\s\S]*?to\s*\{\s*background-position:\s*0%\s+50%/)
  })

  it('есть ЛОКАЛЬНЫЙ prefers-reduced-motion, а не только глобальный', () => {
    // Глобальный блок давит лишь animation-duration/iteration-count: он не обнуляет
    // animation-delay и не трогает fill-mode, поэтому единственной защитой быть не может.
    expect(CSS).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\[data-site='sealife'\] \.kinetic-wordmark\s*\{\s*animation:\s*none/,
    )
  })

  it('заливка глифов включается только там, где поддержана, и откатывается в высоком контрасте', () => {
    // Без @supports текст исчез бы целиком там, где background-clip: text не работает;
    // без forced-colors/print — в режиме высокого контраста и на печати.
    expect(CSS).toMatch(/@supports \(\(background-clip: text\)/)
    expect(CSS).toMatch(/@media \(forced-colors: active\), print/)
  })

  it('кинетика hero-only: не на .wordmark хедера и не на базовом h1', () => {
    // .wordmark живёт в SiteHeader на каждой странице ОБОИХ сайтов, включая calm-режим
    // sealrescue, где декоративный display-шрифт снят намеренно.
    expect(CSS).not.toMatch(/\.wordmark\s*\{[^}]*animation/)
    expect(rule).toMatch(/\[data-site='sealife'\] \.kinetic-wordmark/)
  })

  it('стопы градиента — только semantic-токены заголовка и ссылки (контраст AA)', () => {
    // azure-bright (--color-accent-cool) и buoy (--color-accent) как стопы запрещены §16/§2e.
    expect(rule).toMatch(/var\(--color-heading\)/)
    expect(rule).toMatch(/var\(--color-link\)/)
    expect(rule).not.toMatch(/--color-accent/)
  })
})

describe('realCover', () => {
  it('настоящая загруженная картинка проходит', () => {
    const media = { url: '/media/seal.webp' }
    expect(realCover(media)).toBe(media)
  })

  it('незаполненная связь и «только id» не проходят', () => {
    // `Cover` при falsy-картинке рисует декоративную заглушку, а её тинт чередуется по seed и
    // включает sandbank — тёплую пару, зарезервированную §6a за rescue-переходом.
    expect(realCover(null)).toBeNull()
    expect(realCover(undefined)).toBeNull()
    expect(realCover(42)).toBeNull() // depth:0 отдаёт связь числом
    expect(realCover({ url: null })).toBeNull()
    expect(realCover({ url: '' })).toBeNull()
  })
})
