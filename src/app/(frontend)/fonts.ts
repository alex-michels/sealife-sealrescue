import { Unbounded, Onest, JetBrains_Mono } from 'next/font/google'

/**
 * Шрифты (DESIGN_BRIEF §2). Self-host через `next/font` — никаких внешних CDN
 * на рантайме (быстрее + EU-friendly). Все три имеют полноценную кириллицу.
 *
 * Display: Baloo 2 из брифа НЕ подходит — у неё нет кириллицы (только latin/деванагари),
 * а русский — основной язык. Берём вторую опцию брифа — Unbounded (округлый, характерный).
 */
export const fontDisplay = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--ff-display',
  display: 'swap',
})

export const fontBody = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--ff-body',
  display: 'swap',
})

export const fontMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--ff-mono',
  display: 'swap',
})
