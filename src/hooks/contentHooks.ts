import crypto from 'crypto'
import type { CollectionBeforeChangeHook } from 'payload'

// Исходная локаль и целевые локали перевода.
// DE добавляется сюда же позже одной строкой.
const SOURCE_LOCALE = 'ru'
const TARGET_LOCALES = ['en'] // ['en', 'de']

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
export const markTranslationsStale: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.locale && req.locale !== SOURCE_LOCALE) return data

  const sourceText = `${data?.title ?? ''}\n${JSON.stringify(data?.body ?? '')}`
  const hash = crypto.createHash('sha256').update(sourceText).digest('hex')

  const existing: Array<{ locale: string; status?: string; sourceHash?: string; translatedAt?: string }> =
    Array.isArray(data.localeStatus) ? data.localeStatus : []

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
