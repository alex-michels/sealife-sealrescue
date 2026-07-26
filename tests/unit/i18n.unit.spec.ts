import { describe, it, expect } from 'vitest'
import {
  locales,
  routeLocales,
  legalOnlyLocales,
  defaultLocale,
  fallbackLocale,
  targetLocales,
  isLocale,
  isRouteLocale,
  chromeLocale,
  localeLabels,
} from '@/i18n/config'
import { t } from '@/i18n/ui'
import { buildAlternates, buildLegalAlternates } from '@/i18n/alternates'
import { sites } from '@/site/config'

/** Инварианты локалей (CLAUDE.md «Локали и роутинг»): ru исходная, en — перевод. */
describe('i18n config invariants', () => {
  it('exactly ru/en, ru is source, en is international fallback', () => {
    expect([...locales]).toEqual(['ru', 'en'])
    expect(defaultLocale).toBe('ru')
    expect(fallbackLocale).toBe('en')
    expect(targetLocales).toEqual(['en'])
  })

  it('isLocale guards', () => {
    expect(isLocale('ru')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('xx')).toBe(false)
    expect(isLocale('')).toBe(false)
    expect(isLocale('RU')).toBe(false)
  })

  it('every locale has a text label (язык ≠ страна, без флагов — DESIGN_BRIEF §9)', () => {
    for (const locale of locales) {
      expect(localeLabels[locale]).toBeTruthy()
    }
  })
})

/**
 * DE удалён как язык сайта 2026-07-26 и остался ТОЛЬКО legal-роутом: оператор в Германии,
 * §5 DDG / §18 MStV не зависят от языков сайта. Контракт: `de` — не контент-локаль,
 * но валидный префикс URL; обвязка страницы на нём деградирует на en.
 * Судьба немецких legal-страниц решается на юрпроверке (EU-06).
 */
describe('legal-only locale (de)', () => {
  it('de is NOT a content locale but IS a route locale', () => {
    expect([...legalOnlyLocales]).toEqual(['de'])
    expect([...routeLocales]).toEqual(['ru', 'en', 'de'])
    expect(isLocale('de')).toBe(false) // ← контентные роуты /de отдают 404
    expect(isRouteLocale('de')).toBe(true) // ← /de/legal-notice и /de/privacy живут
    expect(isRouteLocale('xx')).toBe(false)
  })

  it('chromeLocale falls back to en on de, identity on content locales', () => {
    expect(chromeLocale('de')).toBe('en')
    expect(chromeLocale('ru')).toBe('ru')
    expect(chromeLocale('en')).toBe('en')
  })

  it('de has no UI label (свитчер предлагает только RU/EN)', () => {
    expect(Object.keys(localeLabels)).toEqual(['ru', 'en'])
  })
})

describe('t()', () => {
  it('returns per-locale UI strings', () => {
    expect(t('ru', 'language')).toBe('Язык')
    expect(t('en', 'language')).toBe('Language')
  })

  it('404 microcopy differs by site tone (бриф §7)', () => {
    for (const locale of locales) {
      expect(t(locale, 'notFoundBodyLife')).not.toBe(t(locale, 'notFoundBodyRescue'))
    }
  })
})

/** hreflang/canonical (M0-T10): абсолютные URL от прод-домена сайта, x-default → en. */
describe('buildAlternates', () => {
  it('builds canonical for the current locale and hreflang for content locales only', () => {
    const alt = buildAlternates('/articles', 'en', sites.sealife)
    expect(alt?.canonical).toBe('https://sealife.info/en/articles')
    expect(alt?.languages).toEqual({
      ru: 'https://sealife.info/ru/articles',
      en: 'https://sealife.info/en/articles',
      'x-default': 'https://sealife.info/en/articles',
    })
  })

  /** Legal-страницы шире контентных: у них есть немецкая версия (Impressum/Datenschutz). */
  it('buildLegalAlternates includes the legal-only de version', () => {
    const alt = buildLegalAlternates('/privacy', 'de', sites.sealife)
    expect(alt?.canonical).toBe('https://sealife.info/de/privacy')
    expect(alt?.languages).toEqual({
      ru: 'https://sealife.info/ru/privacy',
      en: 'https://sealife.info/en/privacy',
      de: 'https://sealife.info/de/privacy',
      'x-default': 'https://sealife.info/en/privacy',
    })
  })

  it('homepage (empty suffix) and the other site domain', () => {
    const alt = buildAlternates('', 'ru', sites.sealrescue)
    expect(alt?.canonical).toBe('https://sealrescue.info/ru')
    expect((alt?.languages as Record<string, string>)['x-default']).toBe(
      'https://sealrescue.info/en',
    )
  })

  /**
   * CR-01: у документа из Payload набор локалей не «все контентные», а те, где он реально есть.
   * Рекламировать альтернативу, которая после выключения locale-fallback отдаёт 404, — прямая
   * SEO-ошибка, поэтому hreflang строится по фактической доступности.
   */
  describe('available (доступность документа по локалям)', () => {
    it('одна локаль: только её язык, x-default указывает на неё же', () => {
      const alt = buildAlternates('/only-ru', 'ru', sites.sealife, ['ru'])
      const languages = alt?.languages as Record<string, string>
      expect(languages).toEqual({
        ru: 'https://sealife.info/ru/only-ru',
        'x-default': 'https://sealife.info/ru/only-ru',
      })
      // Фантомной английской альтернативы быть не должно вовсе.
      expect(languages.en).toBeUndefined()
    })

    it('обе локали: набор как раньше', () => {
      const languages = buildAlternates('/both', 'en', sites.sealife, ['ru', 'en'])
        ?.languages as Record<string, string>
      expect(languages.ru).toBe('https://sealife.info/ru/both')
      expect(languages.en).toBe('https://sealife.info/en/both')
      expect(languages['x-default']).toBe('https://sealife.info/en/both')
    })

    it('без аргумента поведение не меняется — страницы из кода есть во всех локалях', () => {
      const withDefault = buildAlternates('/articles', 'en', sites.sealife)
      const explicit = buildAlternates('/articles', 'en', sites.sealife, ['ru', 'en'])
      expect(withDefault?.languages).toEqual(explicit?.languages)
    })
  })
})
