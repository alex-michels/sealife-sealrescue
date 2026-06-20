import crypto from 'crypto'
import type { CollectionBeforeChangeHook } from 'payload'
import { defaultLocale, targetLocales } from '../i18n/config'

// Исходная локаль и целевые локали перевода берутся из единого источника
// (src/i18n/config.ts). DE добавляется там одной строкой — здесь ничего менять не надо.
const SOURCE_LOCALE: string = defaultLocale
const TARGET_LOCALES: string[] = targetLocales

/**
 * Агенты публиковать не могут: любое изменение от роли 'agent'
 * принудительно остаётся черновиком. Это и есть human-in-the-loop на уровне БД.
 */
export const forceAgentDrafts: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.user?.role === 'agent') {
    return { ...data, _status: 'draft' }
  }
  return data
}

/**
 * Трекинг integrity перевода (Агент 3).
 * Когда меняется русский (исходный) контент, считаем его хэш и помечаем
 * целевые локали как 'stale'. Дашборд и агент-переводчик видят, что перевод устарел.
 *
 * NB: хук срабатывает на запись конкретной локали (req.locale). Полную
 * мультилокальную сверку удобнее делать отдельным сервисом/агентом, который
 * читает документ во всех локалях. Здесь — рабочий каркас для исходной локали.
 */
export const markTranslationsStale: CollectionBeforeChangeHook = ({ data, req, originalDoc }) => {
  if (req.locale && req.locale !== SOURCE_LOCALE) return data

  const sourceText = `${data?.title ?? ''}\n${JSON.stringify(data?.body ?? '')}`
  const hash = crypto.createHash('sha256').update(sourceText).digest('hex')

  // На partial-update `data.localeStatus` может отсутствовать — берём прежнее состояние
  // из originalDoc, иначе потеряем translatedAt/sourceHash и зря пометим перевод stale.
  const existing: Array<{ locale: string; status?: string; sourceHash?: string; translatedAt?: string }> =
    Array.isArray(data.localeStatus)
      ? data.localeStatus
      : Array.isArray(originalDoc?.localeStatus)
        ? originalDoc.localeStatus
        : []

  const localeStatus = TARGET_LOCALES.map((loc) => {
    const prev = existing.find((r) => r.locale === loc)
    const isStale = !prev || prev.sourceHash !== hash
    return {
      locale: loc,
      status: isStale ? 'stale' : prev?.status ?? 'current',
      sourceHash: prev?.sourceHash ?? null, // агент-переводчик запишет актуальный hash после перевода
      translatedAt: prev?.translatedAt ?? null,
    }
  })

  return { ...data, localeStatus }
}
