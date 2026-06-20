import type { Locale } from '@/i18n/config'

/**
 * Мультидомен в одном Next (M0-T08). Один бэкенд/CMS, два публичных сайта:
 * sealife.info (медиа-хаб, игривый) и sealrescue.info (спасение, серьёзный).
 *
 * Сайт определяется по хосту в `proxy.ts` и подставляется как внутренний
 * сегмент маршрута [site] (URL пользователя остаётся чистым: /ru/…, не /sealife/ru/…).
 */
export const siteIds = ['sealife', 'sealrescue'] as const
export type SiteId = (typeof siteIds)[number]

export interface SiteConfig {
  id: SiteId
  theme: 'sealife' | 'sealrescue' // режим дизайн-токенов (DESIGN_BRIEF)
  domain: string
  brand: Record<Locale, string>
  tagline: Record<Locale, string>
}

export const sites: Record<SiteId, SiteConfig> = {
  sealife: {
    id: 'sealife',
    theme: 'sealife',
    domain: 'sealife.info',
    brand: { ru: 'Тюлень-Инфо', en: 'SeaLife Info' },
    tagline: {
      ru: 'Всё о тюленях: факты, новости, мемы.',
      en: 'Everything about seals: facts, news, memes.',
    },
  },
  sealrescue: {
    id: 'sealrescue',
    theme: 'sealrescue',
    domain: 'sealrescue.info',
    brand: { ru: 'Спасение тюленей', en: 'Seal Rescue' },
    tagline: {
      ru: 'Нашёл тюленя — что делать. Справочник центров реабилитации.',
      en: 'Found a seal — what to do. Directory of rehabilitation centers.',
    },
  },
}

export const defaultSite: SiteId = 'sealife'

export const isSite = (value: string): value is SiteId =>
  (siteIds as readonly string[]).includes(value)

/**
 * Хост → сайт. `override` (?site= / cookie) — только для локалки/превью,
 * где нет двух реальных доменов.
 */
export function resolveSiteId(host?: string | null, override?: string | null): SiteId {
  if (override && isSite(override)) return override
  if (host && host.toLowerCase().includes('sealrescue')) return 'sealrescue'
  return defaultSite
}

/** Абсолютный origin сайта — для canonical/hreflang (production-URL даже в деве). */
export const siteBaseUrl = (site: SiteConfig): string => `https://${site.domain}`
