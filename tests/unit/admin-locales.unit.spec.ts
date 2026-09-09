import { describe, expect, it } from 'vitest'
import { getRequestLanguage } from 'payload'
import configPromise from '@/payload.config'
import { locales } from '@/i18n/config'

describe('CR-17: Payload admin language selection', () => {
  it('the actual sanitized config offers only the content UI languages', async () => {
    const config = await configPromise
    expect(Object.keys(config.i18n.supportedLanguages).sort()).toEqual([...locales].sort())
    expect(config.i18n.fallbackLanguage).toBe('en')
  })

  it.each([
    ['de-DE,de;q=0.9', undefined, 'en'],
    ['de-DE,de;q=0.9', 'de', 'en'],
    ['ru-RU,ru;q=0.9', 'de', 'ru'],
    ['de-DE,de;q=0.9', 'ru', 'ru'],
    ['ru-RU,ru;q=0.9', 'en', 'en'],
    ['', undefined, 'en'],
  ])('Accept-Language=%s, saved language=%s → %s', async (header, saved, expected) => {
    const config = await configPromise
    const cookies = new Map<string, string>()
    if (saved) cookies.set(`${config.cookiePrefix}-lng`, saved)
    expect(
      getRequestLanguage({ config, cookies, headers: new Headers({ 'Accept-Language': header }) }),
    ).toBe(expected)
  })
})
