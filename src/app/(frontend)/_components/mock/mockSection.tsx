import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isLocale, type Locale } from '@/i18n/config'
import { isSite, sites, type SiteId } from '@/site/config'
import { buildAlternates } from '@/i18n/alternates'
import { getSection, type SectionDef } from '@/site/sections'
import { resolvedSection } from '@/site/sectionContent'
import { socialMetadata } from '@/site/social'
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
  // Admin-overrides контента раздела (M1-T27): title/intro из global `section-content`,
  // структура — из кода. Callers читают section.title[locale] как раньше.
  return { site, locale, section: await resolvedSection(section, locale) }
}

/** Метаданные раздела (title + canonical/hreflang). На чужом сайте → пусто (route отдаст 404). */
export async function sectionMetadata(params: RouteParams, slug: string): Promise<Metadata> {
  const { site, locale } = await params
  if (!isSite(site) || !isLocale(locale)) return {}
  const section = getSection(site, slug)
  if (!section) return {}
  const resolved = await resolvedSection(section, locale)
  return {
    title: resolved.title[locale],
    description: resolved.intro[locale],
    alternates: buildAlternates(`/${slug}`, locale, sites[site]),
    ...socialMetadata({
      site,
      locale,
      title: resolved.title[locale],
      description: resolved.intro[locale],
      path: `/${slug}`,
    }),
    ...noindexIfMock(section),
  }
}

/**
 * CR-09: раздел на выдуманных данных не должен попадать в индекс.
 *
 * Из карты сайта его недостаточно просто убрать: списочная страница ссылается на свои детали, и
 * краулер дойдёт до них в один шаг с любой другой страницы. Поэтому машиночитаемый `noindex` —
 * на самих страницах. `MockBanner` для этого не годится: это проза, а не сигнал.
 */
function noindexIfMock(section: SectionDef): Pick<Metadata, 'robots'> {
  return section.mockBacked ? { robots: { index: false, follow: false } } : {}
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
  // Overrides и здесь: back-ссылки деталей используют section.title[locale].
  return { site, locale, slug, section: await resolvedSection(section, locale) }
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
  const section = getSection(site, sectionSlug)
  return {
    title,
    alternates: buildAlternates(`/${sectionSlug}/${slug}`, locale, sites[site]),
    ...(section ? noindexIfMock(section) : {}),
  }
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
