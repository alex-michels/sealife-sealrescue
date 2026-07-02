import { describe, it, expect } from 'vitest'
import { resolveSiteId, isSite, siteBaseUrl, sites, defaultSite } from '@/site/config'

/** Хост → сайт (proxy.ts, M0-T08): sealrescue по подстроке хоста, override — только валидный. */
describe('resolveSiteId', () => {
  it('defaults to sealife', () => {
    expect(resolveSiteId(null)).toBe('sealife')
    expect(resolveSiteId(undefined)).toBe('sealife')
    expect(resolveSiteId('localhost:3000')).toBe('sealife')
    expect(resolveSiteId('sealife.info')).toBe('sealife')
    expect(defaultSite).toBe('sealife')
  })

  it('maps sealrescue hosts by substring, case-insensitive', () => {
    expect(resolveSiteId('sealrescue.info')).toBe('sealrescue')
    expect(resolveSiteId('www.SealRescue.info')).toBe('sealrescue')
    expect(resolveSiteId('staging.sealrescue.example')).toBe('sealrescue')
  })

  it('valid override wins over host', () => {
    expect(resolveSiteId('sealrescue.info', 'sealife')).toBe('sealife')
    expect(resolveSiteId('localhost:3000', 'sealrescue')).toBe('sealrescue')
  })

  it('invalid override is ignored', () => {
    expect(resolveSiteId('sealrescue.info', 'nonsense')).toBe('sealrescue')
    expect(resolveSiteId('localhost:3000', '')).toBe('sealife')
  })
})

describe('isSite / siteBaseUrl', () => {
  it('guards site ids', () => {
    expect(isSite('sealife')).toBe(true)
    expect(isSite('sealrescue')).toBe(true)
    expect(isSite('tyulenta')).toBe(false)
    expect(isSite('')).toBe(false)
  })

  it('builds production origins (canonical/hreflang считаются от прод-домена даже в деве)', () => {
    expect(siteBaseUrl(sites.sealife)).toBe('https://sealife.info')
    expect(siteBaseUrl(sites.sealrescue)).toBe('https://sealrescue.info')
  })
})
