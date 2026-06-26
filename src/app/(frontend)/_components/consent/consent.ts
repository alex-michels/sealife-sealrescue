/**
 * Согласие на аналитику (M0-T11). Opt-in: до явного согласия трекеры НЕ грузятся.
 *
 * Хранится в strictly-necessary consent-COOKIE (не в произвольном localStorage —
 * требование CLAUDE.md/COMPLIANCE §3). Версия — на случай изменения состава
 * трекеров: при апдейте старое согласие игнорируется и спрашивается заново.
 */
export const CONSENT_COOKIE = 'sl-consent'
export const CONSENT_VERSION = 1
export const CONSENT_EVENT = 'sl-consent-change'
const MAX_AGE = 60 * 60 * 24 * 180 // ~6 месяцев

export type ConsentValue = 'granted' | 'denied'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1] ?? '') : null
}

/** Текущий выбор или null, если пользователь ещё не решал (или версия устарела). */
export function getConsent(): ConsentValue | null {
  const raw = readCookie(CONSENT_COOKIE)
  if (!raw) return null
  const [value, version] = raw.split('.')
  if (version !== `v${CONSENT_VERSION}`) return null
  return value === 'granted' || value === 'denied' ? value : null
}

/** Сохранить выбор (consent-cookie) и оповестить компоненты (баннер, аналитика). */
export function setConsent(value: ConsentValue): void {
  if (typeof document === 'undefined') return
  document.cookie = `${CONSENT_COOKIE}=${value}.v${CONSENT_VERSION}; path=/; max-age=${MAX_AGE}; samesite=lax`
  window.dispatchEvent(new Event(CONSENT_EVENT))
}
