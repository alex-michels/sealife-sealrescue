import { describe, it, expect } from 'vitest'
import {
  locales,
  defaultLocale,
  fallbackLocale,
  targetLocales,
  isLocale,
  localeLabels,
} from '@/i18n/config'
import { t } from '@/i18n/ui'
import { buildAlternates } from '@/i18n/alternates'
import { sites } from '@/site/config'

/** Инварианты локалей (CLAUDE.md «Локали и роутинг»): ru исходная, en/de — полноценные. */
describe('i18n config invariants', () => {
  it('exactly ru/en/de, ru is source, en is international fallback', () => {
    expect([...locales]).toEqual(['ru', 'en', 'de'])
    expect(defaultLocale).toBe('ru')
    expect(fallbackLocale).toBe('en')
    expect(targetLocales).toEqual(['en', 'de'])
  })

  it('isLocale guards', () => {
    expect(isLocale('ru')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('de')).toBe(true)
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

describe('t()', () => {
  it('returns per-locale UI strings', () => {
    expect(t('ru', 'language')).toBe('Язык')
    expect(t('en', 'language')).toBe('Language')
    expect(t('de', 'language')).toBe('Sprache')
  })

  it('404 microcopy differs by site tone (бриф §7)', () => {
    for (const locale of locales) {
      expect(t(locale, 'notFoundBodyLife')).not.toBe(t(locale, 'notFoundBodyRescue'))
    }
  })
})

/** hreflang/canonical (M0-T10): абсолютные URL от прод-домена сайта, x-default → en. */
describe('buildAlternates', () => {
  it('builds canonical for the current locale and hreflang for all locales', () => {
    const alt = buildAlternates('/articles', 'de', sites.sealife)
    expect(alt?.canonical).toBe('https://sealife.info/de/articles')
    expect(alt?.languages).toEqual({
      ru: 'https://sealife.info/ru/articles',
      en: 'https://sealife.info/en/articles',
      de: 'https://sealife.info/de/articles',
      'x-default': 'https://sealife.info/en/articles',
    })
  })

  it('homepage (empty suffix) and the other site domain', () => {
    const alt = buildAlternates('', 'ru', sites.sealrescue)
    expect(alt?.canonical).toBe('https://sealrescue.info/ru')
    expect((alt?.languages as Record<string, string>)['x-default']).toBe(
      'https://sealrescue.info/en',
    )
  })
})
