import { describe, it, expect } from 'vitest'
import { sectionDefs, sectionsForSite, navSectionsForSite, getSection } from '@/site/sections'
import { legalNav, legalHref, legalDocs, draftNote } from '@/site/legal'
import { locales } from '@/i18n/config'
import { formatDate } from '@/i18n/date'

/** Разделы принадлежат своему сайту (route guard M0-T19: чужой раздел → 404). */
describe('sections', () => {
  it('every section is fully trilingual (title/label/intro)', () => {
    for (const s of sectionDefs) {
      for (const locale of locales) {
        expect(s.title[locale], `${s.slug}.title.${locale}`).toBeTruthy()
        expect(s.label[locale], `${s.slug}.label.${locale}`).toBeTruthy()
        expect(s.intro[locale], `${s.slug}.intro.${locale}`).toBeTruthy()
      }
    }
  })

  it('getSection guards by site: чужой раздел не резолвится', () => {
    expect(getSection('sealife', 'quizzes')).toBeDefined()
    expect(getSection('sealrescue', 'quizzes')).toBeUndefined()
    expect(getSection('sealrescue', 'rescue-centers')).toBeDefined()
    expect(getSection('sealife', 'rescue-centers')).toBeUndefined()
    expect(getSection('sealife', 'no-such-section')).toBeUndefined()
  })

  it('sectionsForSite splits the catalog; nav is a subset', () => {
    const life = sectionsForSite('sealife')
    const rescue = sectionsForSite('sealrescue')
    expect(life.length + rescue.length).toBe(sectionDefs.length)
    expect(life.every((s) => s.site === 'sealife')).toBe(true)
    for (const site of ['sealife', 'sealrescue'] as const) {
      const all = sectionsForSite(site)
      for (const s of navSectionsForSite(site)) expect(all).toContain(s)
    }
  })
})

/** Legal-shell (M0-T13/EU-07): slug общий, подписи локализованы, DE — Impressum/Datenschutz. */
describe('legal', () => {
  it('same slugs across locales; DE labels are German legal terms', () => {
    const slugs = legalNav.ru.map((l) => l.slug)
    expect(legalNav.en.map((l) => l.slug)).toEqual(slugs)
    expect(legalNav.de.map((l) => l.slug)).toEqual(slugs)
    expect(legalNav.de.find((l) => l.slug === 'legal-notice')?.label).toBe('Impressum')
    expect(legalNav.de.find((l) => l.slug === 'privacy')?.label).toBe('Datenschutz')
  })

  it('href is locale-prefixed; docs + draft note exist for every locale', () => {
    expect(legalHref('de', 'privacy')).toBe('/de/privacy')
    for (const locale of ['ru', 'en', 'de'] as const) {
      expect(draftNote[locale]).toBeTruthy()
      for (const doc of Object.values(legalDocs)) {
        expect(doc[locale].title).toBeTruthy()
        expect(doc[locale].sections.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('formatDate', () => {
  it('renders long localized dates', () => {
    expect(formatDate('2026-07-02', 'en')).toBe('2 July 2026')
    expect(formatDate('2026-07-02', 'ru')).toContain('июля')
    expect(formatDate('2026-07-02', 'de')).toContain('Juli')
  })
})
