import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites, type SiteId } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { getSection, type SectionDef } from '@/site/sections'
import { SectionShell } from './SectionShell'
import { StateSwitcher, parseState, type MockState } from './StateSwitcher'
import { MockList, type SampleCardItem } from './MockList'

export type RouteParams = Promise<{ site: string; locale: string }>
export type SlugParams = Promise<{ site: string; locale: string; slug: string }>
export type SearchParams = Promise<Record<string, string | string[] | undefined>>

export { parseState }

/**
 * Guard раздела (M0-T19): валидирует site+locale и принадлежность раздела сайту.
 * sealife-раздел на sealrescue (и наоборот) ⇒ getSection вернёт undefined ⇒ 404.
 */
export async function requireSection(
  params: RouteParams,
  slug: string,
): Promise<{ site: SiteId; locale: Locale; section: SectionDef }> {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) notFound()
  const section = getSection(site, slug)
  if (!section) notFound()
  return { site, locale, section }
}

/** Метаданные раздела (title + canonical/hreflang). На чужом сайте → пусто (route отдаст 404). */
export async function sectionMetadata(params: RouteParams, slug: string): Promise<Metadata> {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) return {}
  const section = getSection(site, slug)
  if (!section) return {}
  return {
    title: section.title[locale],
    alternates: buildAlternates(`/${slug}`, locale, sites[site]),
  }
}

/** Guard детальной /[slug] страницы: те же проверки сайта/раздела + возвращает slug. */
export async function requireDetail(
  params: SlugParams,
  sectionSlug: string,
): Promise<{ site: SiteId; locale: Locale; slug: string; section: SectionDef }> {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale)) notFound()
  const section = getSection(site, sectionSlug)
  if (!section) notFound()
  return { site, locale, slug, section }
}

/** Метаданные детальной страницы; title резолвится по найденной sample-записи. */
export async function detailMetadata(
  params: SlugParams,
  sectionSlug: string,
  resolveTitle: (locale: Locale, slug: string) => string | undefined,
): Promise<Metadata> {
  const { site, locale, slug } = await params
  if (!isSite(site) || !isLocale(locale)) return {}
  if (!getSection(site, sectionSlug)) return {}
  const title = resolveTitle(locale, slug)
  if (!title) return {}
  return { title, alternates: buildAlternates(`/${sectionSlug}/${slug}`, locale, sites[site]) }
}

/** Общий рендер списочной mock-страницы: shell + демо-переключатель состояний + список. */
export function SectionListView({
  site,
  locale,
  slug,
  title,
  intro,
  items,
  state,
}: {
  site: SiteId
  locale: Locale
  slug: string
  title: string
  intro?: string
  items: SampleCardItem[]
  state: MockState
}) {
  const basePath = `/${locale}/${slug}`
  return (
    <SectionShell locale={locale} title={title} intro={intro}>
      <StateSwitcher basePath={basePath} locale={locale} current={state} />
      <MockList site={site} locale={locale} state={state} items={items} basePath={basePath} />
    </SectionShell>
  )
}
