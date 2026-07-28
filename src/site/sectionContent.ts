import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Media } from '@/payload-types'
import type { Locale } from '@/i18n/config'
import type { SiteId } from './config'
import { sectionsForSite, type SectionDef } from './sections'

/**
 * Наложение admin-overrides (global `section-content`, M1-T27) на разделы из кода.
 *
 * Правила (инвариант задачи): структура — только код; БД дополняет, не создаёт.
 *  - override применяется по slug; строки с неизвестным slug ИГНОРИРУЮТСЯ
 *    (не могут создать/сломать раздел);
 *  - пустое значение локали → fallback на код (глобал читается с fallbackLocale: false,
 *    чтобы пустой en НЕ подменялся русским текстом override'а).
 */

export type SectionOverrideRow = {
  section?: string | null
  title?: string | null
  intro?: string | null
  cover?: Media | number | null
}

export type ResolvedSection = SectionDef & { cover: Media | null }

/** Чистая логика мержа — покрыта unit-тестами (QA: фича без теста — баг). */
export function applySectionOverride(
  def: SectionDef,
  rows: SectionOverrideRow[] | null | undefined,
  locale: Locale,
): ResolvedSection {
  const row = (rows ?? []).find((r) => r.section === def.slug)
  if (!row) return { ...def, cover: null }
  const title = row.title?.trim() ? { ...def.title, [locale]: row.title } : def.title
  const intro = row.intro?.trim() ? { ...def.intro, [locale]: row.intro } : def.intro
  const cover = row.cover && typeof row.cover === 'object' ? row.cover : null
  return { ...def, title, intro, cover }
}

/**
 * Строки overrides для локали (без locale-fallback'а — пустое поле остаётся пустым).
 *
 * CR-13: `cache()` дедуплицирует вызов В ПРЕДЕЛАХ ОДНОГО рендера. Next дедуплицирует только
 * `fetch`, а local API Payload — нет, поэтому каждый секционный роут ходил за этим глобалом
 * дважды: один раз в `generateMetadata`, второй в `requireSection`. Это НЕ кэш между запросами —
 * данные по-прежнему свежие на каждый запрос (SSR per-request), просто один запрос не спрашивает
 * об одном и том же дважды.
 */
export const fetchSectionOverrides = cache(async function fetchSectionOverrides(
  locale: Locale,
): Promise<SectionOverrideRow[]> {
  const payload = await getPayload({ config })
  const global = await payload.findGlobal({
    slug: 'section-content',
    locale,
    fallbackLocale: false,
    depth: 1,
  })
  return (global.overrides ?? []) as SectionOverrideRow[]
})

/** Раздел из кода + overrides (H1/intro/cover) для текущей локали. */
export async function resolvedSection(def: SectionDef, locale: Locale): Promise<ResolvedSection> {
  return applySectionOverride(def, await fetchSectionOverrides(locale), locale)
}

/** Карточки хаба разделов на главной (label из кода, intro/cover с overrides). */
export async function sectionCardsForSite(
  site: SiteId,
  locale: Locale,
): Promise<ResolvedSection[]> {
  const rows = await fetchSectionOverrides(locale)
  return sectionsForSite(site).map((def) => applySectionOverride(def, rows, locale))
}
