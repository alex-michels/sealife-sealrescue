import { describe, it, expect } from 'vitest'
import { previewPath, safeRedirectPath, isPreviewable } from '@/preview/paths'
import { defaultLocale } from '@/i18n/config'

/**
 * **CR-08** — предпросмотр черновика.
 *
 * Здесь проверяется чистая часть, и главная из двух — `safeRedirectPath`. Эндпоинт предпросмотра
 * принимает путь из query-параметра; слабая проверка превращает его в **открытый редирект** с
 * нашего домена, да ещё и с включённым draft-режимом. Поэтому список отвергаемых форм подробный.
 */

describe('previewPath', () => {
  it('контент лежит на /<locale>/<slug>', () => {
    expect(previewPath('content', 'why-seals-cry', defaultLocale)).toBe(
      `/${defaultLocale}/why-seals-cry`,
    )
  })

  it('вид — на /<locale>/species/<slug>', () => {
    expect(previewPath('species', 'grey-seal', 'ru')).toBe('/ru/species/grey-seal')
  })

  it('черновик без slug предпросматривать нечего', () => {
    // Payload не покажет кнопку — это честнее, чем вести на битый URL.
    expect(previewPath('content', null, defaultLocale)).toBeNull()
    expect(previewPath('content', '', defaultLocale)).toBeNull()
  })

  it('коллекция без публичной детали не предпросматривается', () => {
    expect(previewPath('media', 'x', defaultLocale)).toBeNull()
    expect(isPreviewable('media')).toBe(false)
  })

  it('не-контентная локаль отвергается (в т.ч. legal-only de)', () => {
    // Под /de контента нет вовсе — предпросматривать там нечего.
    expect(previewPath('content', 'about', 'de')).toBeNull()
    expect(previewPath('content', 'about', 'xx')).toBeNull()
  })
})

describe('safeRedirectPath — защита от открытого редиректа', () => {
  it('относительный путь проходит', () => {
    expect(safeRedirectPath('/en/about')).toBe('/en/about')
    expect(safeRedirectPath('/ru/species/grey-seal?x=1')).toBe('/ru/species/grey-seal?x=1')
  })

  it('абсолютный URL отвергается', () => {
    expect(safeRedirectPath('https://evil.example/x')).toBeNull()
    expect(safeRedirectPath('http://evil.example')).toBeNull()
  })

  it('protocol-relative //host отвергается — браузер считает его абсолютным', () => {
    expect(safeRedirectPath('//evil.example')).toBeNull()
  })

  it('обратный слеш отвергается — часть парсеров трактует его как /', () => {
    expect(safeRedirectPath('/\\evil.example')).toBeNull()
    expect(safeRedirectPath('\\\\evil.example')).toBeNull()
  })

  it('пустое и относительное без ведущего слеша отвергаются', () => {
    expect(safeRedirectPath('')).toBeNull()
    expect(safeRedirectPath(null)).toBeNull()
    expect(safeRedirectPath('en/about')).toBeNull()
  })
})
